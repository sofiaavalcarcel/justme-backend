import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ScheduleDayDto } from './src/schedule/dtos/schedule.dto';

async function simulateValidation() {
    console.log('--- Simulating Schedule Validation ---');

    const validPayload = [
        {
            dayOfWeek: 'Monday',
            startTime: '08:00',
            endTime: '17:00',
            isActive: true,
            breaks: [
                { title: 'Lunch', startTime: '12:00', endTime: '13:00' }
            ]
        }
    ];

    console.log('Testing valid payload...');
    for (const item of validPayload) {
        const dto = plainToInstance(ScheduleDayDto, item);
        const errors = await validate(dto);
        if (errors.length > 0) {
            console.error('Validation FAILED for valid payload:', JSON.stringify(errors, null, 2));
        } else {
            console.log('Validation PASSED for valid payload.');
        }
    }

    const invalidPayload = [
        {
            dayOfWeek: 'Monday',
            // Missing startTime
            endTime: '17:00',
            isActive: 'not-a-boolean', // Wrong type
            extraField: 'should be forbidden'
        }
    ];

    console.log('\nTesting invalid payload (should fail)...');
    for (const item of invalidPayload) {
        const dto = plainToInstance(ScheduleDayDto, item);
        const errors = await validate(dto);
        if (errors.length > 0) {
            console.log('Validation FAILED as expected. Errors found:', errors.length);
        } else {
            console.error('Validation PASSED unexpectedly for invalid payload!');
        }
    }
}

simulateValidation();
