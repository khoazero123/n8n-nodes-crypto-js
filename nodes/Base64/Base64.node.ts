/* eslint-disable n8n-nodes-base/node-param-options-type-unsorted-items */

import set from 'lodash/set';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

export class Base64 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Base64',
		name: 'base64',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:base64.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: 'Base64 encode and decode a string',
		defaults: {
			name: 'Base64',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				options: [
					{
						name: 'Base64 Encode',
						description: 'Base64 encode a string',
						value: 'base64Encode',
						action: 'Base64 encode a string',
					},
					{
						name: 'Base64 Decode',
						description: 'Base64 decode a string',
						value: 'base64Decode',
						action: 'Base64 decode a string',
					},

				],
				default: 'base64Decode',
			},
            {
				displayName: 'Value',
				name: 'value',
				type: 'string',
				typeOptions: {
					editor: 'htmlEditor',
					rows: 10,
				},
				default: '',
				description: 'The value that should be encoded or decoded',
				required: true,
			},
			{
				displayName: 'Output Property Name',
				name: 'outputPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the property to which to write the encoded or decoded value',
			},
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add option',
                default: {},
                options: [
                    {
                        displayName: 'JSON Parse',
                        name: 'jsonParse',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to parse the value as JSON',
                    },
                ],
                displayOptions: {
                    show: {
                        action: ['base64Decode'],
                    },
                },
            },
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const action = this.getNodeParameter('action', 0) as string;

		let item: INodeExecutionData;
		for (let i = 0; i < length; i++) {
			try {
				item = items[i];
				const outputPropertyName = this.getNodeParameter('outputPropertyName', i) as string;
				const value = this.getNodeParameter('value', i, '') as string;
                const { jsonParse } = this.getNodeParameter('options', i, {}) as { jsonParse: boolean };
				let newValue;
				let binaryProcessed = false;

                if (action === 'base64Encode') {
                    newValue = Buffer.from(value).toString('base64');
                }

				if (action === 'base64Decode') {
					newValue = Buffer.from(value, 'base64').toString();
                    if (jsonParse) {
                        newValue = JSON.parse(newValue);
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
