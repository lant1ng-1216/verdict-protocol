// src/lib/contract.ts

import { getAddress } from 'viem';

export const CONTRACT_ADDRESSES = {
  bscTestnet: getAddress('0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994'),
  mantleSepolia: getAddress('0xE731a80668Ad0439a6B55e57f65C1D7885827566'),
} as const;

export const NATIVE = '0x0000000000000000000000000000000000000000' as `0x${string}`;

// Status enum (mirrors Solidity)
export const DuelStatus = { Open: 0, Active: 1, Settled: 2, Disputed: 3, Cancelled: 4 } as const;
export const DuelSide = { None: 0, Red: 1, Blue: 2 } as const;

export const PROTOCOL_BET_ABI = [
  // ── READ ──
  {
    name: 'counter',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getDuel',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'red', type: 'address' },
        { name: 'blue', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'wager', type: 'uint256' },
        { name: 'audioBps', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'claimHash', type: 'bytes32' },
        { name: 'ruleHash', type: 'bytes32' },
        { name: 'vis', type: 'uint8' },
        { name: 'status', type: 'uint8' },
        { name: 'winner', type: 'uint8' },
        { name: 'settledAt', type: 'uint256' },
      ],
    }],
  },
  {
    name: 'poolRed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'poolBlue',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'betRed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }, { name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'betBlue',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }, { name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'claimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }, { name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  // ── WRITE ──
  {
    name: 'create',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'wager', type: 'uint256' },
      { name: 'audioBps', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
      { name: 'claimHash', type: 'bytes32' },
      { name: 'ruleHash', type: 'bytes32' },
      { name: 'vis', type: 'uint8' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    name: 'accept',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'bet',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'side', type: 'uint8' },
      { name: 'amt', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'cancel',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'dispute',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'settle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'winner', type: 'uint8' },
    ],
    outputs: [],
  },
  // ── EVENTS ──
  {
    name: 'Created',
    type: 'event',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'red', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'wager', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Accepted',
    type: 'event',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'blue', type: 'address', indexed: true },
    ],
  },
  {
    name: 'Settled',
    type: 'event',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'winner', type: 'uint8', indexed: false },
    ],
  },
  {
    name: 'Claimed',
    type: 'event',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'bettor', type: 'address', indexed: true },
      { name: 'amt', type: 'uint256', indexed: false },
    ],
  },
] as const;
