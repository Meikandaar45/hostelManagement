import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { listStudents, getStudent, createStudent, updateStudent, setStudentStatus } from '../controllers/studentController';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN', 'WARDEN'));

router.get('/', listStudents);
router.post('/', createStudent);
router.get('/:id', getStudent);
router.patch('/:id', updateStudent);
router.patch('/:id/status', setStudentStatus);

export default router;
