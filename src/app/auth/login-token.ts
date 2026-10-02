import { jwtDecode } from 'jwt-decode';

import { CONFIG } from '../../environments/environment';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Decode and validate the claims needed for MQTT routing. Token verification
// belongs to the authentication server; decoding does not verify a signature.
export function getLoginMqttTopic(token: string, platform: string): string | null {
  let claims: unknown;
  try {
    claims = jwtDecode<unknown>(token);
  } catch {
    return null;
  }
  if (!isRecord(claims)) return null;

  switch (platform) {
    case 'PREVDX':
    case 'ECODX': {
      if (!Array.isArray(claims['scope'])) return null;
      const scope = claims['scope'][0];
      if (typeof scope !== 'string' || !/^SUBSCRIBER:\d+$/.test(scope)) return null;
      const subscriberId = 100000000 + Number(scope.slice('SUBSCRIBER:'.length));
      if (!Number.isSafeInteger(subscriberId)) return null;
      return `${CONFIG[platform].OPERATOR_ID}|${subscriberId}/LE_AS/abeemap/#`;
    }
    case 'PREVKC':
    case 'ECOKC': {
      const subscriptions = claims['parentSubscriptions'];
      if (!isRecord(subscriptions)) return null;
      const entries = subscriptions['actility-sup/tpx'];
      if (!Array.isArray(entries) || !isRecord(entries[0])) return null;
      const subscriberId = entries[0]['subscriberId'];
      if (!(typeof subscriberId === 'string' && /^\d+$/.test(subscriberId))
        && !(typeof subscriberId === 'number' && Number.isSafeInteger(subscriberId) && subscriberId >= 0)) {
        return null;
      }
      const subject = claims['sub'];
      if (typeof subject !== 'string' || !subject || /[\s/|+#\u0000-\u001f\u007f]/.test(subject)) return null;
      return `${CONFIG[platform].OPERATOR_ID}|${subscriberId}|${CONFIG[platform].REALM}|${subject}/LE_AS/abeemap/#`;
    }
    default:
      return null;
  }
}
