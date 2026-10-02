import { CONFIG } from '../../environments/environment';
import { getLoginMqttTopic } from './login-token';

export function encodeLoginToken(payload: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${encoded}.signature`;
}

describe('login MQTT claims', () => {
  for (const platform of ['PREVDX', 'ECODX']) {
    it(`decodes base64url UTF-8 payloads for ${platform}`, () => {
      const token = encodeLoginToken({ scope: ['SUBSCRIBER:123'], name: '名字😀࿿' });
      expect(token.split('.')[1]).toMatch(/[-_]/);
      expect(getLoginMqttTopic(token, platform)).toBe(`${CONFIG[platform].OPERATOR_ID}|100000123/LE_AS/abeemap/#`);
    });

    for (const scope of [undefined, null, 'SUBSCRIBER:123', [], [123], ['OTHER:123'],
      ['SUBSCRIBER:'], ['SUBSCRIBER:-1'], ['SUBSCRIBER:123abc'], ['SUBSCRIBER:1.5'], ['SUBSCRIBER:9007199254740991']]) {
      it(`rejects invalid DX scope ${JSON.stringify(scope)} on ${platform}`, () => {
        expect(getLoginMqttTopic(encodeLoginToken({ scope }), platform)).toBeNull();
      });
    }

    it(`accepts a zero subscriber ID on ${platform}`, () => {
      expect(getLoginMqttTopic(encodeLoginToken({ scope: ['SUBSCRIBER:0'] }), platform))
        .toBe(`${CONFIG[platform].OPERATOR_ID}|100000000/LE_AS/abeemap/#`);
    });
  }

  for (const platform of ['PREVKC', 'ECOKC']) {
    for (const subscriberId of ['123', 123, '0', 0]) {
      it(`accepts subscriber ${JSON.stringify(subscriberId)} on ${platform}`, () => {
        const token = encodeLoginToken({ parentSubscriptions: { 'actility-sup/tpx': [{ subscriberId }] }, sub: 'user-1' });
        expect(getLoginMqttTopic(token, platform))
          .toBe(`${CONFIG[platform].OPERATOR_ID}|${subscriberId}|${CONFIG[platform].REALM}|user-1/LE_AS/abeemap/#`);
      });
    }

    for (const parentSubscriptions of [undefined, null, [], {}, { 'actility-sup/tpx': {} },
      { 'actility-sup/tpx': [] }, { 'actility-sup/tpx': [null] }, { 'actility-sup/tpx': [{}] }]) {
      it(`rejects invalid subscriptions ${JSON.stringify(parentSubscriptions)} on ${platform}`, () => {
        expect(getLoginMqttTopic(encodeLoginToken({ parentSubscriptions, sub: 'user-1' }), platform)).toBeNull();
      });
    }

    for (const subscriberId of ['', '123abc', '12/3', '#', null, {}, -1, 1.5, 9007199254740992]) {
      it(`rejects invalid subscriber ${JSON.stringify(subscriberId)} on ${platform}`, () => {
        const token = encodeLoginToken({ parentSubscriptions: { 'actility-sup/tpx': [{ subscriberId }] }, sub: 'user-1' });
        expect(getLoginMqttTopic(token, platform)).toBeNull();
      });
    }

    for (const sub of [undefined, null, '', {}, ' ', 'user/#', 'user+', 'user|other', 'user\u0000']) {
      it(`rejects invalid subject ${JSON.stringify(sub)} on ${platform}`, () => {
        const token = encodeLoginToken({ parentSubscriptions: { 'actility-sup/tpx': [{ subscriberId: '123' }] }, sub });
        expect(getLoginMqttTopic(token, platform)).toBeNull();
      });
    }
  }

  for (const token of ['', 'not-a-jwt', 'header.%%%.signature', 'header.bm90LWpzb24.signature',
    ...[null, [], 'claims', 42].map(encodeLoginToken)]) {
    it(`rejects malformed token ${token}`, () => {
      expect(getLoginMqttTopic(token, 'ECODX')).toBeNull();
      expect(getLoginMqttTopic(token, 'ECOKC')).toBeNull();
    });
  }
});
