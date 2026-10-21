const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const MESSAGE = 'Credenciales incorrectas. Verifique su correo y contrasena';
function load(file, dependencies = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', 'module', ...Object.keys(globals), code)(
    id => dependencies[id] ?? {}, module.exports, module, ...Object.values(globals));
  return module.exports;
}
const errors = load('src/utils/loginErrors.ts');

function loginRoute(matches, authResult, lockedFor = 0) {
  const attempts = [], signIns = [];
  const service = {
    rpc: async (name, args) => {
      if (name === 'record_login_attempt') attempts.push(args);
      return { data: name === 'login_retry_after' ? lockedFor : null, error: null };
    },
    from: () => ({ select: () => ({ ilike: () => ({ limit: async () => ({ data: matches, error: null }) }) }) }),
  };
  const route = load('src/app/api/auth/login/route.ts', {
    '@/utils/loginErrors': errors,
    '@/lib/supabaseServer': {
      ServerConfigError: class extends Error {}, isSameOrigin: () => true,
      clientIp: () => '127.0.0.1', ilikeExact: value => value,
      createServiceClient: () => service,
      createAnonServerClient: () => ({ auth: {
        signInWithPassword: async args => { signIns.push(args); return authResult; },
        signOut: async () => {},
      } }),
      staffAuthEmail: username => `${username}@auth.example.test`,
      recordAudit: async () => {},
      json: (body, status = 200, headers = {}) => Response.json(body, { status, headers }),
    },
  });
  return { ...route, attempts, signIns };
}
const request = identifier => new Request('https://restaurant.example/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier, password: 'clave-incorrecta' }),
});

test('API de login: correo inexistente, clave incorrecta y perfil sin vínculo responden exactamente igual', async () => {
  assert.equal(errors.INVALID_CREDENTIALS_MESSAGE, MESSAGE);
  const staff = { id: 'profile', username: 'mozo', name: 'Personal', auth_user_id: 'auth-user', status: 'Activo' };
  const cases = [
    { identifier: 'inexistente@example.test', matches: [], detail: 'User not found' },
    { identifier: 'mozo@example.test', matches: [staff], detail: 'Invalid password' },
    { identifier: 'sin-vinculo@example.test', matches: [{ ...staff, auth_user_id: null }], detail: 'Email not confirmed' },
    { identifier: 'inactivo@example.test', matches: [{ ...staff, status: 'Inactivo' }], detail: 'Invalid password' },
  ];
  for (const entry of cases) {
    const route = loginRoute(entry.matches, { data: { user: null, session: null }, error: { message: entry.detail } });
    const response = await route.POST(request(entry.identifier));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: MESSAGE });
    assert.equal(route.signIns.length, 1, 'también se consulta Auth cuando la cuenta no existe');
    assert.equal(route.attempts[0].p_success, false, 'se conserva el registro para limitar intentos');
  }
});

function authService(fetch, extraAuth = {}, extraDependencies = {}) {
  return load('src/services/authService.ts', {
    '@/utils/loginErrors': errors,
    '@/lib/supabase': { supabase: { auth: {
      getSession: async () => ({ data: { session: null } }), ...extraAuth,
    }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: { id: 'profile', name: 'Mozo', username: 'mozo', role: 'floor', email: 'mozo@example.test' }, error: null,
    }) }) }) }) } },
    '@/utils/security': { cacheAuthProfile() {}, clearAuthProfile() {} },
    '@/utils/sessionPersistence': { isBrowserSessionExpired: () => false, rememberSessionChoice() {} },
    ...extraDependencies,
  }, { fetch });
}

test('authService: ningún error 401 del servidor revela si la cuenta existe', async () => {
  for (const error of ['Usuario o correo no encontrado', 'Contraseña incorrecta', 'Email not confirmed', undefined]) {
    const service = authService(async () => Response.json(error ? { error } : {}, { status: 401 }));
    for (const identifier of ['inexistente@example.test', 'mozo@example.test']) {
      const result = await service.loginStaff(identifier, 'incorrecta');
      assert.equal(result.ok, false);
      assert.equal(result.error, MESSAGE);
      assert.equal(result.retryAfterSeconds, undefined);
    }
  }
});

test('login: conserva el bloqueo por intentos, los errores de conexión y el acceso correcto', async () => {
  const route = loginRoute([], null, 60);
  const response = await route.POST(request('inexistente@example.test'));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal(route.signIns.length, 0);
  const blocked = await authService(async () => Response.json({ error: 'Demasiados intentos fallidos.', retryAfter: 60 }, { status: 429 }))
    .loginStaff('mozo', 'incorrecta');
  assert.equal(blocked.retryAfterSeconds, 60);
  assert.equal(blocked.error, 'Demasiados intentos fallidos.');
  const offline = await authService(async () => { throw new Error('Network failed'); }).loginStaff('mozo', 'clave');
  assert.match(offline.error, /Sin conexión/);
  let savedSession;
  const session = { access_token: 'test-access', refresh_token: 'test-refresh' };
  const signedIn = await authService(async () => Response.json({ session, mustChangePassword: true }), {
    setSession: async value => { savedSession = value; return { error: null }; },
    getClaims: async () => ({ data: { claims: { sub: 'auth-user' } } }),
  }).loginStaff('mozo@example.test', 'correcta');
  assert.deepEqual(savedSession, session);
  assert.equal(signedIn.ok, true);
  assert.equal(signedIn.user.role, 'floor');
  assert.equal(signedIn.mustChangePassword, true);
});
