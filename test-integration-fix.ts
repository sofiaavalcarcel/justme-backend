import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProfessionalDto } from './src/professionals/dtos/professional.dto';

async function simulateFrontendRequest() {
    console.log('--- Simulating Frontend Integration Request ---');

    // This payload matches exactly what ProSchedule.tsx sends
    const frontendPayload = {
        schedule: {
            activeDays: { 
                Monday: true, Tuesday: true, Wednesday: true, 
                Thursday: true, Friday: true, Saturday: true, Sunday: false 
            },
            dayTimes: {
                Monday: { start: '09:00', end: '18:00' },
                Tuesday: { start: '09:00', end: '18:00' },
                Wednesday: { start: '09:00', end: '18:00' },
                Thursday: { start: '09:00', end: '18:00' },
                Friday: { start: '09:00', end: '18:00' },
                Saturday: { start: '09:00', end: '18:00' },
                Sunday: { start: '09:00', end: '18:00' },
            },
            breaks: [{ name: 'Lunch Break', start: '13:00', end: '14:00' }],
            maxAppointments: 8,
            bufferTime: 15,
            advanceNotice: 2,
        }
    };

    console.log('Applying transformations (as ProfessionalsService would do)...');
    
    // 1. Validate DTO
    const dto = plainToInstance(UpdateProfessionalDto, frontendPayload);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    
    if (errors.length > 0) {
        console.error('Validation FAILED:', JSON.stringify(errors, null, 2));
    } else {
        console.log('Validation PASSED (No more 400 error).');
        
        // 2. Test transformation logic (simplified)
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const transformed: any[] = [];
        const feSchedule = frontendPayload.schedule;

        days.forEach(day => {
            const isActive = feSchedule.activeDays[day];
            const times = feSchedule.dayTimes[day];
            transformed.push({
                dayOfWeek: day,
                startTime: times.start,
                endTime: times.end,
                isActive: isActive,
                breaks: feSchedule.breaks.map((b: any) => ({
                    title: b.name,
                    startTime: b.start,
                    endTime: b.end
                }))
            });
        });

        console.log('Transformed Schedule Sample (Monday):', JSON.stringify(transformed[0], null, 2));
        console.log('Number of days transformed:', transformed.length);
    }
}

simulateFrontendRequest();
