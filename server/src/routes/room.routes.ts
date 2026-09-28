import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { listRooms, getRoom, createRoom, updateRoom, allocateRoom, reallocateRoom, vacateRoom } from '../controllers/roomController';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN', 'WARDEN'));

router.get('/', listRooms);
router.post('/', createRoom);
router.get('/:id', getRoom);
router.patch('/:id', updateRoom);
router.post('/:id/allocate', allocateRoom);
router.post('/:id/vacate', vacateRoom);

// Reallocation and vacate action routes
router.post('/reallocate', reallocateRoom);
router.post('/vacate', vacateRoom);

export default router;

