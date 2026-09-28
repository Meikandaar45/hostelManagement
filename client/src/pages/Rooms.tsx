import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Search, Home, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { roomService } from '@/services/roomService';
import type { Room, PaginatedResult } from '@/types';

const createRoomSchema = z.object({
  room_number: z.string().min(1, 'Room number is required'),
  block: z.string().min(1, 'Block is required'),
  floor: z.coerce.number().int().min(0, 'Floor must be >= 0'),
  room_type: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY']),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
});

const allocateSchema = z.object({
  student_id: z.coerce.number().int().positive('Student ID is required'),
});

type CreateRoomForm = z.infer<typeof createRoomSchema>;
type AllocateForm = z.infer<typeof allocateSchema>;

export function Rooms() {
  const [data, setData] = useState<PaginatedResult<Room> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [block, setBlock] = useState('');
  const [roomType, setRoomType] = useState('');
  const [status, setStatus] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Allocation state
  const [allocationRoom, setAllocationRoom] = useState<Room | null>(null);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);

  const { toast } = useToast();

  const { register: registerCreate, handleSubmit: handleSubmitCreate, formState: { errors: createErrors, isSubmitting: isCreating }, reset: resetCreate } = useForm<CreateRoomForm>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: { capacity: 1, floor: 0, room_type: 'SINGLE' }
  });

  const { register: registerAllocate, handleSubmit: handleSubmitAllocate, formState: { errors: allocateErrors, isSubmitting: isAllocating }, reset: resetAllocate } = useForm<AllocateForm>({
    resolver: zodResolver(allocateSchema),
  });

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const result = await roomService.getRooms({
        page,
        limit: 10,
        search: search || undefined,
        block: block || undefined,
        room_type: roomType || undefined,
        status: status || undefined,
      });
      setData(result);
    } catch (err: any) {
      toast({
        title: 'Error fetching rooms',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [page, search, block, roomType, status]);

  const handleCreate = async (data: CreateRoomForm) => {
    try {
      await roomService.createRoom(data);
      toast({ title: 'Room created successfully', type: 'success' });
      setIsCreateModalOpen(false);
      resetCreate();
      fetchRooms();
    } catch (err: any) {
      toast({
        title: 'Error creating room',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    }
  };

  const handleAllocate = async (data: AllocateForm) => {
    if (!allocationRoom) return;
    try {
      await roomService.allocateRoom(allocationRoom.id, data.student_id);
      toast({ title: 'Student allocated successfully', type: 'success' });
      setIsAllocateModalOpen(false);
      resetAllocate();
      fetchRooms();
    } catch (err: any) {
      toast({
        title: 'Allocation failed',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    }
  };

  const openAllocateModal = (room: Room) => {
    setAllocationRoom(room);
    setIsAllocateModalOpen(true);
  };

  const columns = [
    { header: 'Room No.', accessor: (room: Room) => <span className="font-semibold text-slate-900">{room.room_number}</span> },
    { header: 'Block', accessor: (room: Room) => room.block },
    { header: 'Floor', accessor: (room: Room) => room.floor },
    { header: 'Type', accessor: (room: Room) => room.room_type.replace('_', ' ') },
    { 
      header: 'Occupancy', 
      accessor: (room: Room) => (
        <div className="flex items-center gap-1.5 text-slate-600">
          <Users size={16} className={room.current_occupancy! >= room.capacity ? 'text-red-500' : 'text-primary-500'} />
          <span className="font-medium">{room.current_occupancy}</span> / {room.capacity}
        </div>
      ) 
    },
    { 
      header: 'Status', 
      accessor: (room: Room) => {
        let variant: 'success' | 'warning' | 'danger' = 'success';
        if (room.status === 'PARTIALLY_OCCUPIED') variant = 'warning';
        if (room.status === 'FULL') variant = 'danger';
        return <Badge variant={variant}>{room.status?.replace('_', ' ')}</Badge>;
      } 
    },
    {
      header: 'Actions',
      accessor: (room: Room) => (
        <Button 
          size="sm" 
          variant="outline" 
          disabled={room.status === 'FULL'}
          onClick={() => openAllocateModal(room)}
        >
          Allocate
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Rooms" 
        description="Manage hostel rooms and capacity."
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={20} className="mr-2" /> Add Room
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search room number..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select 
            value={block} 
            onChange={(e) => { setBlock(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "All Blocks" },
              { value: "A", label: "Block A" },
              { value: "B", label: "Block B" },
              { value: "C", label: "Block C" },
              { value: "D", label: "Block D" },
            ]}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select 
            value={roomType} 
            onChange={(e) => { setRoomType(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "All Types" },
              { value: "SINGLE", label: "Single" },
              { value: "DOUBLE", label: "Double" },
              { value: "TRIPLE", label: "Triple" },
              { value: "DORMITORY", label: "Dormitory" },
            ]}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select 
            value={status} 
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "All Statuses" },
              { value: "AVAILABLE", label: "Available" },
              { value: "PARTIALLY_OCCUPIED", label: "Partially Occupied" },
              { value: "FULL", label: "Full" },
            ]}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <Table keyExtractor={(row: any) => row.id || Math.random().toString()}
          columns={columns}
          data={data?.items || []}
          loading={loading}
          emptyMessage="No rooms found."
        />
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              page={data.page}
              total={data.total}
              limit={data.limit}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Room"
      >
        <form onSubmit={handleSubmitCreate(handleCreate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Room Number" {...registerCreate('room_number')} error={createErrors.room_number?.message} />
            <Input label="Block" {...registerCreate('block')} error={createErrors.block?.message} />
            
            <Input label="Floor" type="number" {...registerCreate('floor')} error={createErrors.floor?.message} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Room Type</label>
              <Select 
                {...registerCreate('room_type')} 
                error={createErrors.room_type?.message}
                options={[
                  { value: "SINGLE", label: "Single" },
                  { value: "DOUBLE", label: "Double" },
                  { value: "TRIPLE", label: "Triple" },
                  { value: "DORMITORY", label: "Dormitory" },
                ]}
              />
            </div>
            
            <Input label="Capacity" type="number" {...registerCreate('capacity')} error={createErrors.capacity?.message} />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating}>
              Add Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Allocate Modal */}
      <Modal
        open={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        title={`Allocate Room ${allocationRoom?.room_number}`}
      >
        <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-4">
          <Home className="text-primary-500" size={24} />
          <div>
            <p className="text-sm font-medium text-slate-900">Block {allocationRoom?.block} - Floor {allocationRoom?.floor}</p>
            <p className="text-sm text-slate-500">
              Capacity: {allocationRoom?.current_occupancy} / {allocationRoom?.capacity} occupied
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmitAllocate(handleAllocate)} className="space-y-4">
          <Input 
            label="Student System ID" 
            placeholder="Enter the numeric student ID"
            type="number"
            {...registerAllocate('student_id')} 
            error={allocateErrors.student_id?.message} 
          />
          <p className="text-xs text-slate-500">
            Note: This is the internal system ID of the student. In a full implementation, this would be a searchable dropdown.
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsAllocateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isAllocating}>
              Allocate
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
