import { describe, it, expect } from 'vitest';
import {
  parseEmailAddress,
  normalizeRecipient,
  normalizeRecipients,
} from '../../src/core/types.js';

describe('Types & Recipient Normalization', () => {
  describe('parseEmailAddress', () => {
    it('parses standard email string without name', () => {
      expect(parseEmailAddress('user@example.com')).toEqual({
        address: 'user@example.com',
      });
      expect(parseEmailAddress('  user@example.com  ')).toEqual({
        address: 'user@example.com',
      });
    });

    it('parses RFC 5322 format with name and angle brackets', () => {
      expect(parseEmailAddress('Sender Name <sender@example.com>')).toEqual({
        address: 'sender@example.com',
        name: 'Sender Name',
      });
    });

    it('parses quoted name format', () => {
      expect(parseEmailAddress('"Sender Name" <sender@example.com>')).toEqual({
        address: 'sender@example.com',
        name: 'Sender Name',
      });
      expect(parseEmailAddress("'Single Quoted' <sender@example.com>")).toEqual({
        address: 'sender@example.com',
        name: 'Single Quoted',
      });
    });

    it('parses angle brackets only without name', () => {
      expect(parseEmailAddress('<sender@example.com>')).toEqual({
        address: 'sender@example.com',
      });
    });

    it('handles invalid or empty input safely', () => {
      expect(parseEmailAddress('')).toEqual({ address: '' });
      expect(parseEmailAddress('   ')).toEqual({ address: '' });
      expect(parseEmailAddress('not-an-email')).toEqual({ address: 'not-an-email' });
    });
  });

  describe('normalizeRecipient & normalizeRecipients', () => {
    it('normalizes string recipients', () => {
      expect(normalizeRecipient('  user@example.com  ')).toEqual({
        address: 'user@example.com',
      });
    });

    it('normalizes EmailAddress objects', () => {
      expect(normalizeRecipient({ address: 'user@example.com', name: 'User' })).toEqual({
        address: 'user@example.com',
        name: 'User',
      });
    });

    it('normalizes legacy/standard { email, name } objects', () => {
      expect(normalizeRecipient({ email: 'user@example.com', name: 'User' })).toEqual({
        address: 'user@example.com',
        name: 'User',
      });
    });

    it('normalizes array of recipients and filters empty addresses', () => {
      const recipients = normalizeRecipients([
        'user1@example.com',
        { address: 'user2@example.com', name: 'User Two' },
        { email: 'user3@example.com' },
        '   ',
      ]);

      expect(recipients).toHaveLength(3);
      expect(recipients[0]).toEqual({ address: 'user1@example.com' });
      expect(recipients[1]).toEqual({ address: 'user2@example.com', name: 'User Two' });
      expect(recipients[2]).toEqual({ address: 'user3@example.com' });
    });

    it('returns empty array when recipients is undefined', () => {
      expect(normalizeRecipients(undefined)).toEqual([]);
    });
  });
});
