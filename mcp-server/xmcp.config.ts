import { type XmcpConfig } from 'xmcp';

const config: XmcpConfig = {
  http: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3002,
  },
};

export default config;
