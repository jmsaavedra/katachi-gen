import { type XmcpConfig } from 'xmcp';

const config: XmcpConfig = {
  http: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3002,
  },
  prompts: false, // Disable prompts - not using this feature
  resources: false, // Disable resources - not using this feature
};

export default config;
