import assert from 'assert'
import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'MirrorTestToken'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    // Only deploy on testnets
    if (hre.network.name === 'monad-mainnet') {
        console.log('Skipping MirrorTestToken deployment on mainnet')
        return
    }

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            deployer, // treasury - deployer receives all tokens on testnet
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy
