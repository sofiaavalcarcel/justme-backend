import { ModulesGuard } from './modules.guard.guard';

describe('ModulesGuardGuard', () => {
  it('should be defined', () => {
    expect(new ModulesGuard({} as any)).toBeDefined();
  });
});
