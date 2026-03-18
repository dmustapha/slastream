// File: relay/lit-action/action.js
// Runs inside Lit Protocol Naga V1 TEE nodes.
// Do NOT import npm packages — ethers v5 is available as a global `ethers`.
// In SDK v8: access params via `jsParams.xxx` (not bare variable names).

(async () => {
  // ---------------------------------------------------------------------------
  // Step 1: Verify the pdpProofTxHash exists on Filecoin Calibration FEVM
  // ---------------------------------------------------------------------------

  let txReceipt;
  try {
    const provider = new ethers.providers.JsonRpcProvider(jsParams.fevmRpcUrl);
    txReceipt = await provider.getTransactionReceipt(jsParams.pdpProofTxHash);
  } catch (err) {
    const errMsg = `Failed to fetch tx receipt from FEVM: ${err.message}`;
    console.error(errMsg);
    Lit.Actions.setResponse({ response: JSON.stringify({ error: errMsg }) });
    return;
  }

  if (!txReceipt) {
    const errMsg = `Transaction ${jsParams.pdpProofTxHash} not found on FEVM`;
    Lit.Actions.setResponse({ response: JSON.stringify({ error: errMsg }) });
    return;
  }

  if (txReceipt.status !== 1) {
    const errMsg = `Transaction ${jsParams.pdpProofTxHash} failed on FEVM (status: ${txReceipt.status})`;
    Lit.Actions.setResponse({ response: JSON.stringify({ error: errMsg }) });
    return;
  }

  // Verify the tx was sent to the PDP Verifier contract
  if (
    txReceipt.to &&
    txReceipt.to.toLowerCase() !== jsParams.pdpVerifierAddress.toLowerCase()
  ) {
    const errMsg = `Transaction recipient ${txReceipt.to} does not match PDP Verifier ${jsParams.pdpVerifierAddress}`;
    Lit.Actions.setResponse({ response: JSON.stringify({ error: errMsg }) });
    return;
  }

  console.log(`Verified pdpProofTxHash on FEVM: block ${txReceipt.blockNumber}`);

  // ---------------------------------------------------------------------------
  // Step 2: Construct the signing payload
  // Must match Cairo _compute_message_hash exactly:
  // keccak256(solidityPack(['uint256','uint256','uint256','uint256','uint256'],
  //   [dealId, chunkIndex, proofSetId, rootCID, timestamp]))
  // ---------------------------------------------------------------------------

  const dealIdBN = ethers.BigNumber.from(jsParams.dealId);
  const chunkIndexBN = ethers.BigNumber.from(jsParams.chunkIndex);
  const proofSetIdBN = ethers.BigNumber.from(jsParams.proofSetId);
  const rootCIDBN = ethers.BigNumber.from(jsParams.rootCID);
  const timestampBN = ethers.BigNumber.from(jsParams.timestamp);

  const packedData = ethers.utils.solidityPack(
    ["uint256", "uint256", "uint256", "uint256", "uint256"],
    [dealIdBN, chunkIndexBN, proofSetIdBN, rootCIDBN, timestampBN]
  );

  const msgHash = ethers.utils.keccak256(packedData);
  const msgHashBytes = ethers.utils.arrayify(msgHash);

  console.log(`Signing payload hash: ${msgHash}`);

  // ---------------------------------------------------------------------------
  // Step 3: Sign with PKP secp256k1 key (Naga V1: signAndCombineEcdsa)
  // ---------------------------------------------------------------------------

  let signature;
  try {
    signature = await Lit.Actions.signAndCombineEcdsa({
      toSign: msgHashBytes,
      publicKey: jsParams.pkpPublicKey,
      sigName: "slastream_release",
    });
  } catch (err) {
    const errMsg = `PKP signing failed: ${err.message}`;
    console.error(errMsg);
    Lit.Actions.setResponse({ response: JSON.stringify({ error: errMsg }) });
    return;
  }

  // signAndCombineEcdsa returns the combined sig directly as a JSON string
  const sigObj = JSON.parse(signature);

  const response = {
    sig_r: "0x" + sigObj.r,
    sig_s: "0x" + sigObj.s,
    sig_v: sigObj.v,
  };

  console.log(`Signing complete. v: ${sigObj.v}`);

  Lit.Actions.setResponse({ response: JSON.stringify(response) });
})();
