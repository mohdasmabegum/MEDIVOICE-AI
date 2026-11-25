import React, { useState, useEffect } from 'react';
import { Doctor, DoctorStatus } from '../../types';
import { 
  Search, 
  Star, 
  Clock, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Plus, 
  X,
  CheckCircle2
} from 'lucide-react';

interface DoctorsViewProps {
  doctors: Doctor[];
  searchQuery?: string;
  onDoctorAdded?: (newDoctor: Doctor) => void;
}

export const DoctorsView: React.FC<DoctorsViewProps> = ({ 
  doctors, 
  searchQuery = '',
  onDoctorAdded 
}) => {
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New doctor form state
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocDept, setNewDocDept] = useState('General Medicine');
  const [newDocRoom, setNewDocRoom] = useState('');
  const [newDocContact, setNewDocContact] = useState('');

  // Sync external search query from TopNavbar
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const departments = ['all', ...Array.from(new Set(doctors.map((d) => d.department)))];

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(localSearch.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(localSearch.toLowerCase()) ||
      doc.department.toLowerCase().includes(localSearch.toLowerCase()) ||
      doc.roomNumber.toLowerCase().includes(localSearch.toLowerCase());

    const matchesDept = filterDepartment === 'all' || doc.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const getStatusBadge = (status: DoctorStatus) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Available Today
          </span>
        );
      case 'in_consultation':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]"></span>
            In Consultation
          </span>
        );
      case 'off_duty':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Off Duty
          </span>
        );
    }
  };

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName || !newDocSpecialty) return;

    const created: Doctor = {
      id: `doc-${Date.now()}`,
      name: newDocName.startsWith('Dr.') ? newDocName : `Dr. ${newDocName}`,
      title: 'MD',
      specialization: newDocSpecialty,
      department: newDocDept,
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=256&h=256',
      status: 'available',
      rating: 5.0,
      totalPatients: 0,
      experienceYears: 5,
      contact: newDocContact || '+1 (555) 000-0000',
      email: `${newDocName.toLowerCase().replace(/[^a-z]/g, '')}@medivoice.health`,
      roomNumber: newDocRoom || 'Suite 101',
      nextAvailableSlot: 'Today, 2:00 PM',
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      slotsToday: ['02:00 PM', '03:30 PM', '04:30 PM']
    };

    onDoctorAdded?.(created);
    setShowAddModal(false);
    setNewDocName('');
    setNewDocSpecialty('');
    setNewDocRoom('');
    setNewDocContact('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
              Physicians Directory
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
              {filteredDoctors.length} Doctors
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Manage provider schedules, specializations, consulting rooms, and automated voice dispatch slots.
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Doctor</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Local Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by physician name, specialty, room..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] focus:bg-white transition-all"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] font-medium focus:outline-none focus:border-[#0D9488]"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] font-medium focus:outline-none focus:border-[#0D9488]"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="in_consultation">In Consultation</option>
            <option value="off_duty">Off Duty</option>
          </select>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.map((doc) => (
          <div
            key={doc.id}
            onClick={() => setSelectedDoctor(doc)}
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-card hover:shadow-elevated transition-all p-5 flex flex-col justify-between group cursor-pointer"
          >
            <div>
              {/* Profile Top */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={doc.avatar}
                      alt={doc.name}
                      className="w-14 h-14 rounded-2xl object-cover ring-1 ring-slate-200"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                        doc.status === 'available'
                          ? 'bg-emerald-500'
                          : doc.status === 'in_consultation'
                          ? 'bg-[#0D9488]'
                          : 'bg-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-[#172033] group-hover:text-[#0D9488] transition-colors">
                      {doc.name}
                    </h3>
                    <p className="text-xs font-medium text-[#0D9488]">{doc.specialization}</p>
                    <p className="text-[11px] text-[#64748B]">{doc.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{doc.rating}</span>
                </div>
              </div>

              {/* Status and Room */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                {getStatusBadge(doc.status)}
                <div className="flex items-center gap-1 text-xs text-[#64748B]">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">{doc.roomNumber}</span>
                </div>
              </div>

              {/* Contact info */}
              <div className="mt-3 space-y-1.5 text-xs text-[#64748B]">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-[11px]">{doc.contact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] truncate">{doc.email}</span>
                </div>
              </div>

              {/* Slots Today */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-2">
                  Today's Slots Available for AI Voice
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {doc.slotsToday.length > 0 ? (
                    doc.slotsToday.map((slot, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-teal-50 text-[#0D9488] text-xs font-medium border border-teal-200/60"
                      >
                        {slot}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      No more open slots today
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[#64748B]">
                Next: <strong className="text-[#172033]">{doc.nextAvailableSlot}</strong>
              </span>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDoctor(doc);
                }}
                className="text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] hover:underline"
              >
                View Schedule →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Doctor Schedule & Profile Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-elevated w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedDoctor(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
              <img
                src={selectedDoctor.avatar}
                alt={selectedDoctor.name}
                className="w-16 h-16 rounded-2xl object-cover ring-1 ring-slate-200"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-[#172033]">{selectedDoctor.name}</h3>
                  <span className="text-xs font-mono text-[#64748B]">{selectedDoctor.title}</span>
                </div>
                <p className="text-sm font-semibold text-[#0D9488]">{selectedDoctor.specialization}</p>
                <p className="text-xs text-[#64748B]">{selectedDoctor.department}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[#64748B] block">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedDoctor.status)}</div>
                </div>
                <div>
                  <span className="text-[#64748B] block">Room Suite</span>
                  <span className="font-semibold text-[#172033] mt-1 block">{selectedDoctor.roomNumber}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Experience</span>
                  <span className="font-semibold text-[#172033] mt-1 block">{selectedDoctor.experienceYears} Years</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Patient Rating</span>
                  <span className="font-semibold text-[#172033] mt-1 flex items-center gap-1 text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {selectedDoctor.rating} / 5.0
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-[#172033] block mb-1">Weekly Operating Days</span>
                <div className="flex gap-1.5">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => {
                    const active = selectedDoctor.availableDays.includes(day);
                    return (
                      <span
                        key={day}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          active
                            ? 'bg-teal-50 text-[#0D9488] border-teal-200 font-semibold'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="font-semibold text-[#172033] block mb-1">Today's Available Consultation Slots</span>
                <div className="flex flex-wrap gap-2">
                  {selectedDoctor.slotsToday.length > 0 ? (
                    selectedDoctor.slotsToday.map((slot, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-teal-50 text-[#0D9488] text-xs font-semibold border border-teal-200"
                      >
                        {slot}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">No remaining consultation slots today.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedDoctor(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-elevated w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Plus className="w-5 h-5 text-[#0D9488]" />
              <h3 className="font-bold text-base text-[#172033]">Add Physician to Roster</h3>
            </div>

            <form onSubmit={handleCreateDoctor} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#172033] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g. Dr. Alex Mercer"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Specialization</label>
                <input
                  type="text"
                  required
                  value={newDocSpecialty}
                  onChange={(e) => setNewDocSpecialty(e.target.value)}
                  placeholder="e.g. Ophthalmology, Oncology..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Department</label>
                <input
                  type="text"
                  value={newDocDept}
                  onChange={(e) => setNewDocDept(e.target.value)}
                  placeholder="e.g. General Medicine"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Room / Suite</label>
                  <input
                    type="text"
                    value={newDocRoom}
                    onChange={(e) => setNewDocRoom(e.target.value)}
                    placeholder="Suite 204"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Direct Phone</label>
                  <input
                    type="text"
                    value={newDocContact}
                    onChange={(e) => setNewDocContact(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Add Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
