// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockPDPVerifier
/// @notice Hackathon mock — emits the same events as the real PDP Verifier
/// so the relay can detect proof events on Filecoin Calibration.
/// In production, the relay would point at the real PDP Verifier contract.
contract MockPDPVerifier {
    event RootsAdded(uint256 indexed proofSetId, bytes32[] rootCIDs);
    event ProofSetLive(uint256 indexed proofSetId);

    uint256 public nextProofSetId = 1;

    /// @notice Create a new proof set (simulates SP registration)
    function createProofSet() external returns (uint256) {
        uint256 id = nextProofSetId++;
        emit ProofSetLive(id);
        return id;
    }

    /// @notice Add roots to a proof set (simulates SP submitting PDP proofs)
    function addRoots(uint256 proofSetId, bytes32[] calldata rootCIDs) external {
        emit RootsAdded(proofSetId, rootCIDs);
    }
}
