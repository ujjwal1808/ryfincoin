## Accounts Required:

- Render (https://dashboard.render.com/register)
- GitHub (https://github.com/signup)
- The Graph (https://thegraph.com/studio/)
- Alchemy (https://auth.alchemy.com/signup)
- Reown (https://cloud.reown.com/sign-up)

# How to deploy the app (using Render(https://render.com/))

- Upload source code to GitHub (backend and frontend code in separate repo)

- Create New KeyValue(https://dashboard.render.com/new/redis) for Redis
- Create New Postgres(https://dashboard.render.com/new/database)
- Create New Webservice(https://dashboard.render.com/web/new) for backend - import backend source code from GitHub Repo
- Create New Webservice(https://dashboard.render.com/web/new) for frontend - import frontend source code from GitHub Repo

## Configure Environment Variables for Backend:

```
PORT=3004
REDIS_URL=<Replace With the Redis URL from Render>
GRAPH_API_URL=<Replace With The Graph API URL(Details Below)>
CACHE_EXPIRATION=3600
UPDATE_INTERVAL_MINUTES=15
DATABASE_URL=<Replace With the Database URL from Render>
```

### How to find the Graph API URL

- Visit The Graph Studio (https://thegraph.com/studio/)
- Connect Wallet and Enter email if logging in for first time
- Click on Create a Subgraph
- Enter a name and click on Create Subgraph
- Follow the instructions on the right(from Install Graph CLI) to deploy a subgraph (For more info, refer Docs: https://thegraph.com/docs/en/subgraphs/quick-start/)
- Once the subgraph is deployed, go back to The Graph Studio dashboard and copy the Query URL from Endpoints section (For production, you may need to publish the subgraph to Arbitrum One. For details, check out: https://thegraph.com/docs/en/subgraphs/developing/publishing/publishing-a-subgraph/)

## Configure Environment Variables for Frontend:

```
# Ethereum RPC URL
NEXT_PUBLIC_RPC_URL=<Replace With ETH RPC URL from Alchemy(Details Below)>

# Reown AppKit configuration
NEXT_PUBLIC_REOWN_PROJECT_ID=<Replace With Project ID from Reown(Details Below)>

NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 (Testnet address, replace with mainnet address)
NEXT_PUBLIC_USDT_CONTRACT_ADDRESS=0x7169D38820dfd117C3FA1f22a697dBA58d90BA06 (Testnet address, replace with mainnet address)
NEXT_PUBLIC_RYFN_CONTRACT_ADDRESS=0x5930F0d0628C72466815b9eBcED6C5A42a3D676D (Testnet address, replace with mainnet address)
NEXT_PUBLIC_PRESALE_CONTRACT_ADDRESS=<Replace With Deployed Presale Contract Address>

# Base API URL
NEXT_PUBLIC_API_URL=<Replace With the Deployed Backend URL from Render>
```

### How to find the RPC URL

- Go to https://www.alchemy.com/ and signup
- Go to dashboard and click on + Create new app
- Name the project and select appropriate environment, chain and network
- From the dashboard, copy the Network URL

### How to find Reown AppKit ProjectID

- Sign up at https://cloud.reown.com/sign-up
- Create a project from the dashboard (Select AppKit and Next.js when prompted)
- Scroll down and copy the Project ID from the dashboard
