import { describe, expect, test } from '@jest/globals';
import { Validator } from 'jsonschema';
import { homeOptionsSchema } from '../src/config';

describe('cameraMaxFPS configuration', () => {
  test.each([
    [15, true],
    [30, true],
    [60, false],
  ])('validates %i fps as %p', (cameraMaxFPS, valid) => {
    const result = new Validator().validate({
      projectType: '2',
      accessId: 'EXAMPLE_ACCESS_ID',
      accessKey: 'EXAMPLE_ACCESS_SECRET',
      countryCode: 1,
      username: 'EXAMPLE_APP_ACCOUNT',
      password: 'EXAMPLE_APP_PASSWORD',
      appSchema: 'smartlife',
      cameraMaxFPS,
    }, homeOptionsSchema);

    expect(result.valid).toBe(valid);
  });
});
