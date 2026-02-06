import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  const mockAppService = {
    getHello: jest.fn(),
    getHealth: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      mockAppService.getHello.mockReturnValue('Hello World!');

      const result = appController.getHello();

      expect(appService.getHello).toHaveBeenCalled();
      expect(result).toBe('Hello World!');
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const mockHealthResponse = {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 100.5,
        environment: 'development',
        version: '0.0.1',
        database: 'connected',
      };
      mockAppService.getHealth.mockReturnValue(mockHealthResponse);

      const result = appController.getHealth();

      expect(appService.getHealth).toHaveBeenCalled();
      expect(result).toEqual(mockHealthResponse);
      expect(result.status).toBe('ok');
    });

    it('should include all required fields in health response', () => {
      const mockHealthResponse = {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 50.25,
        environment: 'production',
        version: '1.0.0',
        database: 'connected',
      };
      mockAppService.getHealth.mockReturnValue(mockHealthResponse);

      const result = appController.getHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('database');
    });
  });
});
