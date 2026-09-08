import { z } from 'zod';
import { ScheduleEventSchema } from './src/schemas';

const data = [
  {
    id: 96,
    title: 'Assistência - Cryoscope - Terra Alegre Lacticínios, S.A',
    startDate: '2026-01-23T16:00:00Z',
    endDate: '2026-01-23T18:00:00.000Z',
    hasReport: false,
    isCompleted: false,
    technicians: [ { id: 'some-uuid', name: 'John Doe' } ]
  }
];

const res = ScheduleEventSchema.safeParse(data[0]);
console.log(res);
