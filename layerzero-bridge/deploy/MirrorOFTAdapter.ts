import assert from 'assert'
import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'MirrorOFTAdapter'

// LayerZero EndpointV2 addresses
const ENDPOINTS: Record<string, string> = {
    'monad-mainnet': '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B',
    'monad-testnet': '0x6C7Ab2202C98C4227C5c46f1417D81144DA716Ff', // placeholder
}

// MIRROR token addresses
const MIRROR_TOKENS: Record<string, string> = {
    'monad-mainnet': '0xa4255bbc36db70b61e30b694dbd5d25ad1ded5ca',
}

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Get LayerZero EndpointV2
    const endpointAddress = ENDPOINTS[hre.network.name]
    if (!endpointAddress) {
        throw new Error(`No LayerZero endpoint configured for network: ${hre.network.name}`)
    }
    
    // Get the MIRROR token address
    let mirrorTokenAddress: string
    
    if (MIRROR_TOKENS[hre.network.name]) {
        // Use existing MIRROR token
        mirrorTokenAddress = MIRROR_TOKENS[hre.network.name]
    } else {
        // For testnet, we deploy a test token first
        const testTokenDeployment = await hre.deployments.get('MirrorTestToken')
        mirrorTokenAddress = testTokenDeployment.address
    }
    
    console.log(`MIRROR Token: ${mirrorTokenAddress}`)
    console.log(`LayerZero Endpoint: ${endpointAddress}`)

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            mirrorTokenAddress, // MIRROR token address
            endpointAddress,    // LayerZero EndpointV2
            deployer,           // delegate/owner
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy
