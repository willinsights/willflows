import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type ConsoleMethod = 'debug' | 'info' | 'log' | 'warn' | 'error';

const METHODS: ConsoleMethod[] = ['debug', 'info', 'log', 'warn', 'error'];

async function loadLogger(devMode: boolean) {
  vi.resetModules();
  vi.stubEnv('DEV', devMode);
  // Re-import with the new env so the module-level `isDev` is recomputed.
  const mod = await import('../logger');
  return mod.logger;
}

function spyConsole() {
  return {
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    group: vi.spyOn(console, 'group').mockImplementation(() => {}),
    groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
    time: vi.spyOn(console, 'time').mockImplementation(() => {}),
    timeEnd: vi.spyOn(console, 'timeEnd').mockImplementation(() => {}),
  };
}

describe('logger gating', () => {
  let spies: ReturnType<typeof spyConsole>;

  beforeEach(() => {
    spies = spyConsole();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('in development (import.meta.env.DEV = true)', () => {
    it('forwards every level to the underlying console', async () => {
      const logger = await loadLogger(true);

      logger.debug('d');
      logger.info('i');
      logger.log('l');
      logger.warn('w');
      logger.error('e');

      for (const m of METHODS) {
        expect(spies[m]).toHaveBeenCalledTimes(1);
      }
    });

    it('runs group/time helpers in dev', async () => {
      const logger = await loadLogger(true);
      const inner = vi.fn();

      logger.group('label', inner);
      logger.time('t');
      logger.timeEnd('t');

      expect(spies.group).toHaveBeenCalledWith('label');
      expect(inner).toHaveBeenCalledTimes(1);
      expect(spies.groupEnd).toHaveBeenCalledTimes(1);
      expect(spies.time).toHaveBeenCalledWith('t');
      expect(spies.timeEnd).toHaveBeenCalledWith('t');
    });
  });

  describe('in production (import.meta.env.DEV = false)', () => {
    it('only forwards error()', async () => {
      const logger = await loadLogger(false);

      logger.debug('d');
      logger.info('i');
      logger.log('l');
      logger.warn('w');
      logger.error('e');

      expect(spies.debug).not.toHaveBeenCalled();
      expect(spies.info).not.toHaveBeenCalled();
      expect(spies.log).not.toHaveBeenCalled();
      expect(spies.warn).not.toHaveBeenCalled();
      expect(spies.error).toHaveBeenCalledTimes(1);
    });

    it('does not run group/time helpers', async () => {
      const logger = await loadLogger(false);
      const inner = vi.fn();

      logger.group('label', inner);
      logger.time('t');
      logger.timeEnd('t');

      expect(inner).not.toHaveBeenCalled();
      expect(spies.group).not.toHaveBeenCalled();
      expect(spies.groupEnd).not.toHaveBeenCalled();
      expect(spies.time).not.toHaveBeenCalled();
      expect(spies.timeEnd).not.toHaveBeenCalled();
    });

    it('error() output includes a level prefix', async () => {
      const logger = await loadLogger(false);

      logger.error('boom', { code: 500 });

      expect(spies.error).toHaveBeenCalledTimes(1);
      const [prefix, ...rest] = spies.error.mock.calls[0];
      expect(String(prefix)).toContain('[ERROR]');
      expect(rest).toEqual(['boom', { code: 500 }]);
    });
  });
});
