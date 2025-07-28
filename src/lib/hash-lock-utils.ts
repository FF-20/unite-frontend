// lib/hash-lock-utils.ts
import { ethers } from 'ethers';
import { randomBytes } from 'crypto';

export class HashLockUtils {
  /**
   * Hash a secret using keccak256
   */
  static hashSecret(secret: string): string {
    return ethers.keccak256(secret);
  }

  /**
   * Create hash lock for single fill
   */
  static forSingleFill(secret: string): string {
    return this.hashSecret(secret);
  }

  /**
   * Get Merkle tree leaves from secrets
   */
  static getMerkleLeaves(secrets: string[]): string[] {
    return secrets.map((secret, index) => 
      ethers.keccak256(
        ethers.solidityPacked(['uint256', 'bytes32'], [index, this.hashSecret(secret)])
      )
    );
  }

  /**
   * Create hash lock for multiple fills using Merkle tree
   */
  static forMultipleFills(leaves: string[]): string {
    let level = leaves;
    while (level.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : left;
        nextLevel.push(ethers.keccak256(
          ethers.solidityPacked(['bytes32', 'bytes32'], [left, right])
        ));
      }
      level = nextLevel;
    }
    return level[0];
  }

  /**
   * Generate cryptographic secrets
   */
  static generateSecrets(count: number): string[] {
    return Array.from({ length: count }, () => '0x' + randomBytes(32).toString('hex'));
  }

  /**
   * Create hash lock based on secret count
   */
  static createHashLock(secrets: string[]): string {
    if (secrets.length === 1) {
      return this.forSingleFill(secrets[0]);
    } else {
      return this.forMultipleFills(this.getMerkleLeaves(secrets));
    }
  }
}