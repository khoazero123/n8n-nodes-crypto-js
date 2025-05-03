/* eslint-disable n8n-nodes-base/node-param-options-type-unsorted-items */

import {AES, enc} from 'crypto-js';
// import NodeRSA from 'node-rsa';
import set from 'lodash/set';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { deepCopy, NodeOperationError } from 'n8n-workflow';
import NodeRSA from 'node-rsa';


enum InputValueType {
	String = 'string',
	Json = 'json',
	Binary = 'binary',
}

enum EncryptOutputType {
	Base64 = 'base64',
}

enum DecryptOutputType {
	String = 'string',
	Json = 'json',
}

export class CryptoJs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crypto Js',
		name: 'cryptoJs',
		icon: 'fa:key',
		iconColor: 'green',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: 'JavaScript library of crypto standards.',
		defaults: {
			name: 'CryptoJs',
			color: '#408000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
            {
                name: 'cryptoJsCredentialsApi',
                required: true,
            },
        ],
		properties: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				options: [
					{
						name: 'Encrypt',
						description: 'Encrypt a string using a passphrase',
						value: 'encrypt',
						action: 'Encrypt a string using a passphrase',
					},
					{
						name: 'Encrypt Private',
						description: 'Encrypt a string using a private key',
						value: 'encryptPrivate',
						action: 'Encrypt a string using a private key',
					},
					{
						name: 'Decrypt',
						description: 'Decrypt a string using a private key',
						value: 'decrypt',
						action: 'Decrypt a string using a private key',
					},
					{
						name: 'Decrypt Public',
						description: 'Decrypt a string using a public key',
						value: 'decryptPublic',
						action: 'Decrypt a string using a public key',
					},
					{
						name: 'Sign',
						description: 'Sign a string using a private key',
						value: 'sign',
						action: 'Sign a string using a private key',
					},

				],
				default: 'decrypt',
			},
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				options: [
					{
						name: 'String',
						value: 'string',
						action: 'String',
					},
					{
						name: 'Json',
						value: 'json',
						action: 'Json',
					},
				],
				displayOptions: {
					show: {
						action: ['encrypt', 'encryptPrivate', 'sign'],
					},
				},
				default: 'string',
			},
			{
				displayName: 'Input Value',
				name: 'inputValue',
				type: 'string',
				typeOptions: {
					editor: 'htmlEditor',
					rows: 10,
				},
				default: '',
				description: 'The value that should be encrypted',
				required: true,
			},
			{
				displayName: 'Encrypt Output Type',
				name: 'encryptOutputType',
				type: 'options',
				options: [
					{
						name: 'Base64',
						value: 'base64',
						action: 'Base64',
					},
				],
				displayOptions: {
					show: {
						action: ['encrypt', 'encryptPrivate'],
					},
				},
				default: 'base64',
			},
			// outputType
			{
				displayName: 'Decrypt Output Type',
				name: 'decryptOutputType',
				type: 'options',
				options: [
					{
						name: 'String',
						value: 'string',
						action: 'String',
					},
					{
						name: 'Json',
						value: 'json',
						action: 'Json',
					},
				],
				displayOptions: {
					show: {
						action: ['decrypt', 'decryptPublic', 'sign'],
					},
				},
				default: 'string',
			},
			{
				displayName: 'Output Property Name',
				name: 'outputPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the property to which to write the decrypted value',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const action = this.getNodeParameter('action', 0) as string;

		const {passphrase, privateKey} = await this.getCredentials('cryptoJsCredentialsApi');

		let item: INodeExecutionData;
		for (let i = 0; i < length; i++) {
			try {
				item = items[i];
				const outputPropertyName = this.getNodeParameter('outputPropertyName', i) as string;
				const inputValue = this.getNodeParameter('inputValue', i, '') as string;
				let newValue;
				let binaryProcessed = false;

				if (action === 'encrypt') {
					if (!passphrase) {
						throw new NodeOperationError(this.getNode(), 'Passphrase is required');
					}
					const encryptOutputType = this.getNodeParameter('encryptOutputType', i) as EncryptOutputType;
					const inputType = this.getNodeParameter('inputType', i) as InputValueType;
					const stringToEncrypt = inputType === InputValueType.String ? inputValue : JSON.stringify(inputValue);
					const encryptedData = AES.encrypt(stringToEncrypt, passphrase as string);
					if (encryptOutputType === EncryptOutputType.Base64) {
						newValue = encryptedData.toString();
					}
				}

				if (action === 'encryptPrivate') {
					// const encryptOutputType = this.getNodeParameter('encryptOutputType', i) as EncryptOutputType;
					const inputType = this.getNodeParameter('inputType', i) as InputValueType;
					const key = new NodeRSA(privateKey as string);
					const stringToEncrypt = inputType === InputValueType.String ? inputValue : JSON.stringify(inputValue);
					const encryptedSymmetricKey = key.encryptPrivate(stringToEncrypt, 'base64');

					newValue = encryptedSymmetricKey;
				}

				if (action === 'sign') {
					if (!privateKey) {
						throw new NodeOperationError(this.getNode(), 'Private key is required');
					}
					// const encryptOutputType = this.getNodeParameter('encryptOutputType', i) as EncryptOutputType;
					const inputType = this.getNodeParameter('inputType', i) as InputValueType;
					const key = new NodeRSA(privateKey as string);
					const stringToEncrypt = inputType === InputValueType.String ? inputValue : JSON.stringify(inputValue);
					const signedData = key.sign(stringToEncrypt, 'base64');
					newValue = signedData;
				}

				if (action === 'decrypt') {
					if (!passphrase) {
						throw new NodeOperationError(this.getNode(), 'Passphrase is required');
					}
					const outputType = this.getNodeParameter('decryptOutputType', i) as DecryptOutputType;
					const decryptedData = AES.decrypt(inputValue, passphrase as string);
					const decryptedString = decryptedData.toString(enc.Utf8);

					if (outputType === DecryptOutputType.String) {
						newValue = decryptedString;
					} else if (outputType === DecryptOutputType.Json) {
						newValue = JSON.parse(decryptedString);
					}
				}

				if (action === 'decryptPublic') {
					if (!privateKey) {
						throw new NodeOperationError(this.getNode(), 'Private key is required');
					}
					const outputType = this.getNodeParameter('decryptOutputType', i) as DecryptOutputType;
					const key = new NodeRSA(privateKey as string);
					const decryptedString = key.decryptPublic(inputValue, "utf8");
					if (outputType === DecryptOutputType.String) {
						newValue = decryptedString;
					} else if (outputType === DecryptOutputType.Json) {
						newValue = JSON.parse(decryptedString);
					}
				}

				let newItem: INodeExecutionData;
				if (outputPropertyName.includes('.')) {
					// Uses dot notation so copy all data
					newItem = {
						json: deepCopy(item.json),
						pairedItem: {
							item: i,
						},
					};
				} else {
					// Does not use dot notation so shallow copy is enough
					newItem = {
						json: { ...item.json },
						pairedItem: {
							item: i,
						},
					};
				}

				if (item.binary !== undefined && !binaryProcessed) {
					newItem.binary = item.binary;
				}

				set(newItem, ['json', outputPropertyName], newValue);

				returnData.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as JsonObject).message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
