import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, ApiError } from '../src/services/api';
afterEach(() => vi.unstubAllGlobals());
describe('browser request boundary', () => {
  it('uses configured prefix and cookie credentials without identity headers', async () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ total: 1 }) }));
    vi.stubGlobal('window', { __FCM_CONFIG__: { environment: 'trial', path: '/__env/trial/backoffice' } }); vi.stubGlobal('fetch',fetch);
    await api('catalog/students');
    expect(fetch).toHaveBeenCalledWith('/__env/trial/backoffice/api/catalog/students', expect.objectContaining({ credentials: 'same-origin', cache: 'no-store', redirect: 'error', headers: { 'X-FCM-Environment': 'trial' } }));
  });
  it('does not retry a failed write or expose private server errors', async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ error: { code: 'revision_conflict', message: 'private sentinel', details: { revision: 2 } } }) }));
    vi.stubGlobal('window', { __FCM_CONFIG__: { environment: 'develop', path: '/__env/develop/backoffice' } }); vi.stubGlobal('fetch',fetch);
    await expect(api('students/a', { method: 'PUT', body: { revision: 1 } })).rejects.toMatchObject({ status: 409, code: 'revision_conflict', details: { revision: 2 } });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(new ApiError(500,'request_failed').message).not.toContain('private sentinel');
  });
});
