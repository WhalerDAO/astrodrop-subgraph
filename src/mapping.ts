import { Bytes, ipfs, json } from "@graphprotocol/graph-ts"
import {
  CreateAstrodrop
} from "../generated/AstrodropFactory/AstrodropFactory"
import { Claimant, Astrodrop, ClaimantAstrodropRelation } from "../generated/schema"

export function handleCreateAstrodrop(event: CreateAstrodrop): void {
  // fetch IPFS file
  let truncatedIPFSHash = event.params.ipfsHash
  let ipfsHash = new Bytes(34)
  ipfsHash[0] = 0x12;
  ipfsHash[1] = 0x20;
  for (let i = 0; i < 32; i++) {
    ipfsHash[i + 2] = truncatedIPFSHash[i]
  }
  let ipfsHashString = ipfsHash.toBase58()
  let rawRootFile = ipfs.cat(ipfsHashString)

  // create Astrodrop entity
  let astrodrop = new Astrodrop(event.params.astrodrop.toHex())
  astrodrop.creator = event.transaction.from.toHex()
  astrodrop.ipfsHash = ipfsHashString
  astrodrop.save()

  // parse IPFS file
  if (rawRootFile != null) {
    let rootFile = json.fromBytes(rawRootFile!).toObject()

    // parse metadata
    let metadata = rootFile.get('metadata').toObject()
    let name = metadata.get('name')
    let description = metadata.get('description')
    let logoURL = metadata.get('logoURL')
    let tokenAddress = metadata.get('tokenAddress')

    if (!name.isNull()) {
      astrodrop.name = name.toString()
    }
    if (!description.isNull()) {
      astrodrop.description = description.toString()
    }
    if (!logoURL.isNull()) {
      astrodrop.logoURL = logoURL.toString()
    }
    if (!tokenAddress.isNull()) {
      astrodrop.tokenAddress = tokenAddress.toString()
    }
    astrodrop.save()

    // parse claimants
    let claimants = rootFile.get('keys').toArray()
    for (let i = 0; i < claimants.length; i++) {
      // create Claimant entity
      let claimant = claimants[i].toString()
      let claimantEntity = Claimant.load(claimant)
      if (claimantEntity == null) {
        claimantEntity = new Claimant(claimant)
        claimantEntity.save()
      }

      // create ClaimantAstrodropRelation entity
      let claimantAstrodropRelation = new ClaimantAstrodropRelation(claimant + astrodrop.id)
      claimantAstrodropRelation.claimant = claimant
      claimantAstrodropRelation.astrodrop = astrodrop.id
      claimantAstrodropRelation.save()
    }
  }
}
