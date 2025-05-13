import {
	// IAuthenticateGeneric,
	// ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CryptoJsCredentialsApi implements ICredentialType {
	name = 'cryptoJsCredentialsApi';
	displayName = 'Crypto Js Credentials API';
	properties: INodeProperties[] = [
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				rows: 10,
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Default Encryption/Decryption Key',
			name: 'passphrase',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
