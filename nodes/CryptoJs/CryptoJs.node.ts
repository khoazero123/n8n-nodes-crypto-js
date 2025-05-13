/* eslint-disable n8n-nodes-base/node-param-options-type-unsorted-items */
const crypto = require('node:crypto');
import {AES, enc} from 'crypto-js';
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

enum EncryptOutputType {
	Base64 = 'base64',
	Hex = 'hex',
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
						name: 'Sign',
						description: 'Sign a string using a private key',
						value: 'sign',
						action: 'Sign a string using a private key',
					},
					{
						name: 'Encrypted Symmetric Key',
						description: 'Create an encrypted symmetric key using a private key',
						value: 'encryptedSymmetricKey',
						action: 'Create an encrypted symmetric key using a private key',
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
						name: 'Base64 Decode',
						description: 'Base64 decode a string',
						value: 'base64Decode',
						action: 'Base64 decode a string',
					},
					{
						name: 'Verify',
						description: 'Verify data using a key and a signature',
						value: 'verify',
						action: 'Verify data using a key and a signature',
					},

				],
				default: 'decrypt',
			},
			{
				displayName: 'Key Type',
				name: 'keyType',
				type: 'options',
				options: [
					{
						name: 'Private',
						value: 'private',
						action: 'Private',
					},
					{
						name: 'Certificate',
						value: 'certificate',
						action: 'Certificate',
					},
				],
				displayOptions: {
					show: {
						action: ['verify'],
					},
				},
				default: 'private',
			},
			{
				displayName: 'Certificate',
				name: 'certificate',
				type: 'string',
				default: '',
				description: 'The certificate that should be used to verify the input value',
				required: true,
				displayOptions: {
					show: {
						keyType: ['certificate'],
					},
				},
			},
			{
				displayName: 'Signature',
				name: 'signature',
				type: 'string',
				default: '',
				description: 'The signature that should be used to verify the input value',
				required: true,
				displayOptions: {
					show: {
						action: ['verify'],
					},
				},
			},
			{
				displayName: 'Custom Passphrase',
				name: 'customPassphrase',
				type: 'string',
				default: '',
				description: 'The passphrase that should be used to encrypt the input value',
				hint: 'If not provided, the passphrase from the credentials will be used',
				displayOptions: {
					show: {
						action: ['encrypt', 'decrypt'],
					},
				},
			},
			{
				displayName: 'Input Value',
				name: 'inputValue',
				type: 'string',
				default: '',
				description: 'The value that should be encrypted',
				required: true,
				displayOptions: {
					hide: {
						action: ['encryptedSymmetricKey'],
					},
				},
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
					{
						name: 'Hex',
						value: 'hex',
						action: 'Hex',
					},
				],
				displayOptions: {
					show: {
						action: ['sign', 'encryptPrivate'],
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
						action: ['decrypt', 'decryptPublic'],
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
		const customPassphrase = this.getNodeParameter('customPassphrase', 0, '') as string;

		const {passphrase: defaultPassphrase, privateKey} = await this.getCredentials('cryptoJsCredentialsApi');
		const passphrase = customPassphrase || defaultPassphrase;

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
					const stringToEncrypt = typeof inputValue === 'object' ? JSON.stringify(inputValue) : inputValue;
					const encryptedData = AES.encrypt(stringToEncrypt, passphrase as string);
					newValue = encryptedData.toString();
				}

				if (action === 'encryptPrivate') {
					const encryptOutputType = this.getNodeParameter('encryptOutputType', i) as EncryptOutputType;
					const key = new NodeRSA(privateKey as string);
					const stringToEncrypt = typeof inputValue === 'object' ? JSON.stringify(inputValue) : inputValue;
					const encryptedSymmetricKey = key.encryptPrivate(stringToEncrypt, encryptOutputType);

					newValue = encryptedSymmetricKey;
				}

				if (action === 'sign') {
					if (!privateKey) {
						throw new NodeOperationError(this.getNode(), 'Private key is required');
					}
					const encryptOutputType = this.getNodeParameter('encryptOutputType', i) as EncryptOutputType;
					const key = new NodeRSA(privateKey as string);
					const stringToEncrypt = typeof inputValue === 'object' ? JSON.stringify(inputValue) : inputValue;
					const signedData = key.sign(stringToEncrypt, encryptOutputType);
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

				if (action === 'base64Decode') {
					newValue = Buffer.from(inputValue, 'base64').toString();
				}

				if (action === 'encryptedSymmetricKey') {
					if (!privateKey) {
						throw new NodeOperationError(this.getNode(), 'Private key is required');
					}
					if (!passphrase) {
						throw new NodeOperationError(this.getNode(), 'Passphrase is required');
					}
					const key = new NodeRSA(privateKey as string);
					const encryptedSymmetricKey = key.encryptPrivate(passphrase as string, 'base64');
					newValue = encryptedSymmetricKey;
				}

				if (action === 'verify') {
					if (!privateKey) {
						throw new NodeOperationError(this.getNode(), 'Public key is required');
					}
					const keyType = this.getNodeParameter('keyType', i) as string;
					let key = new NodeRSA(privateKey as string);
					if (keyType === 'certificate') {
						const certificate = this.getNodeParameter('certificate', i) as string;
						const x509Cert = new crypto.X509Certificate(certificate);
						let keyData = x509Cert.publicKey.export({
							format: "pem",
							type: "pkcs1"
						});
						key = new NodeRSA(keyData);
					}
					const signature = this.getNodeParameter('signature', i) as string;

					const verified = key.verify(Buffer.from(inputValue), signature, "utf8", "base64");
					newValue = verified;
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
