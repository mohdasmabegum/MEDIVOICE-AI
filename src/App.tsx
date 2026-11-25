import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { OverviewTab } from './components/overview/OverviewTab';
import { AssistantView } from './components/assistant/AssistantView';
import { DoctorsView } from './components/doctors/DoctorsView';
import { AppointmentsView } from './components/appointments/AppointmentsView';
import { CallHistoryView } from './components/call-history/CallHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { FullScreenCallModal } from './components/assistant/FullScreenCallModal';
import { BookingSuccessModal } from './components/modals/BookingSuccessModal';
import { CancellationSuccessModal } from './components/modals/CancellationSuccessModal';
import { ToastContainer } from './components/common/ToastContainer';
import { SplashScreen } from './components/common/SplashScreen';
import { useVoiceCall } from './hooks/useVoiceCall';
import { apiService } from './services/api';
import { 
  ActiveTab, 
  DashboardStats, 
  Doctor, 
  Appointment, 
  CallRecord, 
  BookingSuccessData, 
  CancellationSuccessData, 
  ToastMessage 
} from './types';
import { mockStats, mockDoctors, mockAppointments, mockCallRecords } from './data/mockData';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live synchronizing clinical dataset
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [doctors, setDoctors] = useState<Doctor[]>(mockDoctors);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [callRecords, setCallRecords] = useState<CallRecord[]>(mockCallRecords);

  // Phase 2 Modals & Toasts State
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<BookingSuccessData | null>(null);
  const [cancellationSuccessData, setCancellationSuccessData] = useState<CancellationSuccessData | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Initial Splash Screen State (shown once on initial app load)
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashFading, setIsSplashFading] = useState(false);
  const [splashNotice, setSplashNotice] = useState<string | null>(null);

  // Initial fetch through apiService (gracefully falls back to mockData)
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [loadedStats, loadedDoctors, loadedAppointments, loadedCalls] = await Promise.all([
          apiService.getDashboardStats(),
          apiService.getDoctors(),
          apiService.getAppointments(),
          apiService.getCallRecords(),
        ]);
        if (!mounted) return;
        setStats(loadedStats);
        setDoctors(loadedDoctors);
        setAppointments(loadedAppointments);
        setCallRecords(loadedCalls);
      } catch (err) {
        console.warn('Using default clinical dataset:', err);
        if (mounted) {
          setSplashNotice('Loading offline clinic schedule...');
        }
      } finally {
        if (mounted) {
          setIsSplashFading(true);
          setTimeout(() => {
            if (mounted) setShowSplash(false);
          }, 280);
        }
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleShowToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Ref to break circular dependency between voiceCall hook and callback handlers
  const voiceCallRef = useRef<any>(null);

  // Live Synchronized Backend Booking Handler
  const handleVoiceBooking = useCallback(async (data: {
    patientName: string;
    patientPhone: string;
    doctorId: string;
    slot: string;
    symptoms?: string;
    preConfirmedBooking?: BookingSuccessData;
  }): Promise<{ success: boolean; booking?: BookingSuccessData; error?: string }> => {
    let booking: BookingSuccessData;
    const slotPrefix = data.slot.split(' - ')[0].trim().toLowerCase();

    if (data.preConfirmedBooking) {
      // Already confirmed and persisted by the backend Pipecat/Gemini pipeline
      booking = data.preConfirmedBooking;
    } else {
      // 1. Double Booking & Slot Availability Prevention
      const targetDoc = doctors.find((d) => d.id === data.doctorId);
      if (!targetDoc) {
        handleShowToast('error', 'Doctor Not Found', 'The requested physician is not on the active roster.');
        return { success: false, error: 'Physician could not be located on active roster.' };
      }

      const isSlotAvailable = targetDoc.slotsToday.some((s) => s.toLowerCase().includes(slotPrefix));
      if (!isSlotAvailable) {
        handleShowToast('error', 'Slot Already Booked', `The ${data.slot} slot with ${targetDoc.name} is no longer available.`);
        return { success: false, error: `The ${data.slot} slot with ${targetDoc.name} is already booked. Please choose an open slot.` };
      }

      // 2. Duplicate Booking Check (same patient phone + doctor)
      const patientDigits = data.patientPhone.replace(/\D/g, '');
      const isDuplicate = appointments.some(
        (apt) =>
          apt.doctorId === data.doctorId &&
          apt.patientPhone.replace(/\D/g, '') === patientDigits &&
          apt.status !== 'cancelled'
      );
      if (isDuplicate) {
        handleShowToast('warning', 'Duplicate Appointment', `An active booking already exists for this patient with ${targetDoc.name}.`);
        return { success: false, error: `An active appointment already exists for this patient phone with ${targetDoc.name} today.` };
      }

      // 3. Dispatch through real backend service
      const res = await apiService.bookAppointment(data);

      if (!res.success || !res.booking) {
        handleShowToast('error', 'Booking Request Failed', res.error || 'The requested appointment could not be reserved.');
        return { success: false, error: res.error };
      }

      booking = res.booking;
    }

    // 4. Synchronize Appointments List
    const newAppointment: Appointment = {
      id: booking.bookingId,
      patientName: booking.patientName,
      patientPhone: booking.patientPhone,
      doctorId: booking.doctorId,
      doctorName: booking.doctorName,
      doctorSpecialization: booking.doctorSpecialization,
      doctorAvatar: booking.doctorAvatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256&h=256',
      dateTime: booking.appointmentDate,
      timeSlot: booking.appointmentTime,
      durationMinutes: 30,
      status: 'confirmed',
      bookedVia: 'ai_voice',
      symptoms: booking.symptoms || 'Booked via MediVoice Conversational AI',
      roomNumber: booking.roomNumber,
    };

    setAppointments((prev) => [newAppointment, ...prev]);

    // 5. Synchronize Doctor Slots Availability (Remove booked slot & update status)
    let updatedAvailableDocsCount = 0;
    setDoctors((prev) => {
      const updated = prev.map((doc) => {
        if (doc.id === booking.doctorId) {
          const updatedSlots = doc.slotsToday.filter((s) => !s.toLowerCase().includes(slotPrefix));
          return {
            ...doc,
            slotsToday: updatedSlots,
            totalPatients: doc.totalPatients + 1,
            status: updatedSlots.length === 0 ? ('in_consultation' as const) : doc.status,
            nextAvailableSlot: updatedSlots[0] ? `Today, ${updatedSlots[0]}` : 'Tomorrow, 09:00 AM',
          };
        }
        return doc;
      });
      updatedAvailableDocsCount = updated.filter((d) => d.status === 'available' && d.slotsToday.length > 0).length;
      return updated;
    });

    // 6. Synchronize Dashboard Statistics in Real Time
    setStats((prev) => ({
      ...prev,
      todayAppointments: prev.todayAppointments + 1,
      totalCallsToday: prev.totalCallsToday + 1,
      availableDoctors: updatedAvailableDocsCount || prev.availableDoctors,
      aiHandledRatePercentage: Math.min(99.4, +(prev.aiHandledRatePercentage + 0.1).toFixed(1)),
    }));

    // 7. Synchronize Call History Record
    const callDuration = voiceCallRef.current?.duration || 68;
    const callTranscript = (voiceCallRef.current?.transcript || []).map((t: { speaker: string; time: string; text: string }) => ({
      speaker: t.speaker === 'user' ? ('caller' as const) : ('assistant' as const),
      time: typeof t.time === 'string' ? t.time.slice(3) : '00:00',
      text: t.text,
    }));

    const newCallLog: CallRecord = {
      id: `call-${Date.now().toString().slice(-4)}`,
      callerPhone: booking.patientPhone,
      callerName: booking.patientName,
      timestamp: 'Just now',
      durationSeconds: callDuration,
      outcome: 'appointment_booked',
      doctorId: booking.doctorId,
      doctorName: booking.doctorName,
      doctorSpecialization: booking.doctorSpecialization,
      appointmentId: booking.bookingId,
      summary: `Patient successfully reserved consultation with ${booking.doctorName} for ${booking.appointmentTime}. Confirmed phone: ${booking.patientPhone}.`,
      sentiment: 'positive',
      transcript: callTranscript,
    };

    setCallRecords((prev) => [newCallLog, ...prev]);

    // 8. Trigger Green Booking Confirmation Modal
    setBookingSuccessData(booking);
    handleShowToast('success', 'Appointment Confirmed', `Booking ${booking.bookingId} confirmed with ${booking.doctorName}.`);

    return { success: true, booking };
  }, [doctors, appointments, handleShowToast]);

  // Live Synchronized Backend Cancellation Handler
  const handleVoiceCancellation = useCallback(async (
    bookingId: string,
    phone: string,
    reason: string,
    preConfirmedCancellation?: CancellationSuccessData
  ): Promise<{ success: boolean; cancellation?: CancellationSuccessData; error?: string }> => {
    let cancellation: CancellationSuccessData;

    if (preConfirmedCancellation) {
      // Already cancelled and persisted by the backend Pipecat/Gemini pipeline
      cancellation = preConfirmedCancellation;
    } else {
      // 1. Dispatch through real backend service
      const res = await apiService.cancelAppointment(bookingId, phone, reason);

      if (!res.success || !res.cancellation) {
        handleShowToast('error', 'Cancellation Failed', res.error || 'Could not cancel booking in backend.');
        return { success: false, error: res.error };
      }

      cancellation = res.cancellation;
    }

    // 2. Synchronize Appointments List (Mark as cancelled)
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === cancellation.bookingId || apt.patientPhone === cancellation.patientPhone
          ? { ...apt, status: 'cancelled', cancellationReason: cancellation.reason }
          : apt
      )
    );

    // 3. Restore Doctor Slot to Calendar & Availability
    let updatedAvailableCount = 0;
    setDoctors((prev) => {
      const updated = prev.map((doc) => {
        if (
          doc.name === cancellation.doctorName || 
          doc.id === (appointments.find(a => a.id === cancellation.bookingId)?.doctorId)
        ) {
          const restoredSlots = Array.from(new Set([...doc.slotsToday, cancellation.appointmentTime]));
          return {
            ...doc,
            slotsToday: restoredSlots,
            status: 'available' as const,
            nextAvailableSlot: `Today, ${cancellation.appointmentTime}`,
          };
        }
        return doc;
      });
      updatedAvailableCount = updated.filter(d => d.status === 'available' && d.slotsToday.length > 0).length;
      return updated;
    });

    // 4. Synchronize Dashboard Statistics in Real Time
    setStats((prev) => ({
      ...prev,
      cancelledAppointments: prev.cancelledAppointments + 1,
      totalCallsToday: prev.totalCallsToday + 1,
      availableDoctors: updatedAvailableCount || prev.availableDoctors,
    }));

    // 5. Synchronize Call History Record
    const cancelDuration = voiceCallRef.current?.duration || 45;
    const cancelTranscript = (voiceCallRef.current?.transcript || []).map((t: { speaker: string; time: string; text: string }) => ({
      speaker: t.speaker === 'user' ? ('caller' as const) : ('assistant' as const),
      time: typeof t.time === 'string' ? t.time.slice(3) : '00:00',
      text: t.text,
    }));

    const newCallLog: CallRecord = {
      id: `call-${Date.now().toString().slice(-4)}`,
      callerPhone: cancellation.patientPhone,
      callerName: 'Patient (Verbal Request)',
      timestamp: 'Just now',
      durationSeconds: cancelDuration,
      outcome: 'appointment_cancelled',
      summary: `Caller requested cancellation of booking #${cancellation.bookingId}. Doctor slot ${cancellation.appointmentTime} freed.`,
      sentiment: 'neutral',
      transcript: cancelTranscript,
    };

    setCallRecords((prev) => [newCallLog, ...prev]);

    // 6. Trigger Dedicated Cancellation Confirmation Modal
    setCancellationSuccessData(cancellation);
    handleShowToast('warning', 'Appointment Cancelled', `Slot for ${cancellation.doctorName} has been freed.`);

    return { success: true, cancellation };
  }, [handleShowToast, appointments]);

  // Hook for voice calling experience
  const voiceCall = useVoiceCall({
    doctors,
    appointments,
    onBookAppointment: handleVoiceBooking,
    onCancelAppointment: handleVoiceCancellation,
    onShowToast: handleShowToast,
  });

  // Keep voiceCallRef updated with latest state
  voiceCallRef.current = voiceCall;

  // Open Full Screen Calling Modal
  const handleOpenAICall = () => {
    setIsCallModalOpen(true);
    voiceCall.startCall();
  };

  const handleAddDoctor = (newDoc: Doctor) => {
    setDoctors((prev) => [newDoc, ...prev]);
    setStats((prev) => ({
      ...prev,
      totalDoctors: prev.totalDoctors + 1,
      availableDoctors: newDoc.status === 'available' ? prev.availableDoctors + 1 : prev.availableDoctors,
    }));
    handleShowToast('success', 'Physician Added', `${newDoc.name} has been added to the clinical roster.`);
  };

  const handleManualCreateAppointment = (newApt: Appointment) => {
    setAppointments((prev) => [newApt, ...prev]);

    // Also remove slot from doctor's schedule and recalculate availability
    let updatedAvailableDocsCount = 0;
    setDoctors((prev) => {
      const updated = prev.map((doc) => {
        if (doc.id === newApt.doctorId || doc.name === newApt.doctorName) {
          const slotToMatch = newApt.timeSlot.split(' - ')[0].trim();
          const updatedSlots = doc.slotsToday.filter((s) => !s.startsWith(slotToMatch) && s !== newApt.timeSlot);
          return {
            ...doc,
            slotsToday: updatedSlots,
            totalPatients: doc.totalPatients + 1,
            status: updatedSlots.length === 0 ? ('in_consultation' as const) : doc.status,
            nextAvailableSlot: updatedSlots[0] ? `Today, ${updatedSlots[0]}` : 'Tomorrow, 09:00 AM',
          };
        }
        return doc;
      });
      updatedAvailableDocsCount = updated.filter((d) => d.status === 'available' && d.slotsToday.length > 0).length;
      return updated;
    });

    setStats((prev) => ({
      ...prev,
      todayAppointments: prev.todayAppointments + 1,
      availableDoctors: updatedAvailableDocsCount || prev.availableDoctors,
    }));
    handleShowToast('success', 'Appointment Created', `Appointment for ${newApt.patientName} scheduled.`);
  };

  const handleManualCancelAppointment = (id: string, reason: string) => {
    const targetApt = appointments.find((a) => a.id === id);

    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: 'cancelled', cancellationReason: reason } : apt))
    );

    // Restore slot to doctor's schedule
    let updatedAvailableCount = 0;
    if (targetApt) {
      setDoctors((prev) => {
        const updated = prev.map((doc) => {
          if (doc.id === targetApt.doctorId || doc.name === targetApt.doctorName) {
            const restoredSlot = targetApt.timeSlot.split(' - ')[0].trim();
            const restoredSlots = Array.from(new Set([...doc.slotsToday, restoredSlot]));
            return {
              ...doc,
              slotsToday: restoredSlots,
              status: 'available' as const,
              nextAvailableSlot: `Today, ${restoredSlot}`,
            };
          }
          return doc;
        });
        updatedAvailableCount = updated.filter((d) => d.status === 'available' && d.slotsToday.length > 0).length;
        return updated;
      });
    }

    setStats((prev) => ({
      ...prev,
      cancelledAppointments: prev.cancelledAppointments + 1,
      availableDoctors: updatedAvailableCount || prev.availableDoctors,
    }));
    handleShowToast('warning', 'Appointment Cancelled', `Booking #${id} cancelled.`);
  };

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            stats={stats}
            doctors={doctors}
            appointments={appointments}
            calls={callRecords}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectAppointment={() => {
              setActiveTab('appointments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectDoctor={() => {
              setActiveTab('doctors');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onStartAICall={handleOpenAICall}
          />
        );
      case 'assistant':
        return (
          <AssistantView
            doctors={doctors}
            onOpenFullScreenCall={handleOpenAICall}
          />
        );
      case 'doctors':
        return (
          <DoctorsView
            doctors={doctors}
            searchQuery={searchQuery}
            onDoctorAdded={handleAddDoctor}
          />
        );
      case 'appointments':
        return (
          <AppointmentsView
            appointments={appointments}
            searchQuery={searchQuery}
            doctors={doctors}
            onAppointmentCreated={handleManualCreateAppointment}
            onAppointmentCancelled={handleManualCancelAppointment}
          />
        );
      case 'call-history':
        return <CallHistoryView calls={callRecords} searchQuery={searchQuery} />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <OverviewTab
            stats={stats}
            doctors={doctors}
            appointments={appointments}
            calls={callRecords}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onStartAICall={handleOpenAICall}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-[#172033]">
      {/* Initial Application Splash Screen */}
      <SplashScreen
        isVisible={showSplash}
        isFadingOut={isSplashFading}
        errorNotice={splashNotice}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Full-Screen Immersive Calling Modal */}
      <FullScreenCallModal
        isOpen={isCallModalOpen}
        onClose={() => {
          voiceCall.endCall();
          setIsCallModalOpen(false);
        }}
        doctors={doctors}
        appointments={appointments}
        callState={voiceCall.callState}
        duration={voiceCall.duration}
        isMuted={voiceCall.isMuted}
        transcript={voiceCall.transcript}
        audioLevels={voiceCall.audioLevels}
        averageVolume={voiceCall.averageVolume}
        errorMessage={voiceCall.errorMessage}
        onStartCall={voiceCall.startCall}
        onEndCall={voiceCall.endCall}
        onToggleMute={voiceCall.toggleMute}
        onFinalizeSpeech={voiceCall.finalizeSpeechInput}
        onSendSpeech={voiceCall.processUserSpeech}
      />

      {/* Appointment Booking Confirmation Popup (Green Tick Slip) */}
      <BookingSuccessModal
        booking={bookingSuccessData}
        onClose={() => setBookingSuccessData(null)}
      />

      {/* Appointment Cancellation Confirmation Popup */}
      <CancellationSuccessModal
        cancellation={cancellationSuccessData}
        onClose={() => setCancellationSuccessData(null)}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar */}
        <TopNavbar
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onStartAICall={handleOpenAICall}
          activeTab={activeTab}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
