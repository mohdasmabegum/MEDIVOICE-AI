import { BookingSuccessData } from '../types';

/**
 * Generates an authentic binary PDF document (PDF 1.4 specification)
 * with vector shapes, styling, and text coordinates for the appointment slip.
 */
export const generateAppointmentSlipPDFBlob = (booking: BookingSuccessData): Blob => {
  // Sanitize text for PDF string literals
  const sanitize = (str: string) => (str || '').replace(/[\\()]/g, '');

  const clinicName = sanitize(booking.clinicName || 'Metropolitan Health Clinic');
  const bookingId = sanitize(booking.bookingId);
  const patientName = sanitize(booking.patientName || 'Verified Outpatient');
  const patientPhone = sanitize(booking.patientPhone);
  const doctorName = sanitize(booking.doctorName);
  const specialization = sanitize(booking.doctorSpecialization);
  const appointmentDate = sanitize(booking.appointmentDate);
  const appointmentTime = sanitize(booking.appointmentTime);
  const roomNumber = sanitize(booking.roomNumber || 'Suite 402 - Wing B');
  const bookedAt = sanitize(booking.bookedAt);

  // Construct PDF stream commands using standard PDF operators:
  // q (save state), Q (restore), rg (fill color), re (rectangle), f (fill),
  // BT (begin text), ET (end text), Tf (font), Td (move text), Tj (show text)
  const streamCommands = [
    // Top Teal Header bar
    'q',
    '0.051 0.580 0.533 rg', // #0D9488
    '0 800 595.28 41.89 re f',
    'Q',

    // Card border / container
    'q',
    '0.886 0.910 0.941 RG', // #E2E8F0
    '1 w',
    '30 140 535.28 640 re S',
    'Q',

    // MediVoice AI Title
    'BT',
    '/F2 20 Tf',
    '0.090 0.125 0.200 rg', // #172033
    '50 740 Td',
    '(MediVoice AI) Tj',
    'ET',

    // Clinic Subtitle
    'BT',
    '/F1 10 Tf',
    '0.392 0.455 0.545 rg', // #64748B
    '50 724 Td',
    `(${clinicName} - Clinical Outpatient Reception) Tj`,
    'ET',

    // Status Pill
    'q',
    '0.941 0.992 0.957 rg', // #F0FDF4
    '440 730 105 24 re f',
    '0.733 0.969 0.816 RG',
    '1 w',
    '440 730 105 24 re S',
    'Q',
    'BT',
    '/F2 10 Tf',
    '0.086 0.639 0.290 rg', // #16A34A
    '462 737 Td',
    '(CONFIRMED) Tj',
    'ET',

    // Divider
    'q',
    '0.051 0.580 0.533 RG',
    '2 w',
    '50 705 m 545 705 l S',
    'Q',

    // Document Title
    'BT',
    '/F2 16 Tf',
    '0.059 0.463 0.431 rg', // #0F766E
    '180 675 Td',
    '(Appointment Confirmation Slip) Tj',
    'ET',

    'BT',
    '/F1 10 Tf',
    '0.392 0.455 0.545 rg',
    '165 658 Td',
    '(Verified clinical reservation generated via MediVoice AI) Tj',
    'ET',

    // Receipt Background Box
    'q',
    '0.973 0.980 0.988 rg', // #F8FAFC
    '50 360 495 270 re f',
    '0.886 0.910 0.941 RG',
    '1 w',
    '50 360 495 270 re S',
    'Q',

    // Row 1: Booking Reference
    'BT',
    '/F1 11 Tf',
    '0.392 0.455 0.545 rg',
    '70 595 Td',
    '(Booking Reference ID:) Tj',
    'ET',
    'BT',
    '/F2 12 Tf',
    '0.051 0.580 0.533 rg',
    '260 595 Td',
    `(${bookingId}) Tj`,
    'ET',

    // Row 2: Patient Name
    'BT',
    '/F1 11 Tf',
    '0.392 0.455 0.545 rg',
    '70 565 Td',
    '(Patient Full Name:) Tj',
    'ET',
    'BT',
    '/F2 11 Tf',
    '0.090 0.125 0.200 rg',
    '260 565 Td',
    `(${patientName}) Tj`,
    'ET',

    // Row 3: Patient Phone
    'BT',
    '/F1 11 Tf',
    '0.392 0.455 0.545 rg',
    '70 535 Td',
    '(Confirmed Telephone:) Tj',
    'ET',
    'BT',
    '/F2 11 Tf',
    '0.090 0.125 0.200 rg',
    '260 535 Td',
    `(${patientPhone}) Tj`,
    'ET',

    // Row 4: Doctor
    'BT',
    '/F1 11 Tf',
    '0.392 0.455 0.545 rg',
    '70 505 Td',
    '(Attending Physician:) Tj',
    'ET',
    'BT',
    '/F2 11 Tf',
    '0.051 0.580 0.533 rg',
    '260 505 Td',
    `(${doctorName}) Tj`,
    'ET',

    // Row 5: Specialization
    'BT',
    '/F1 11 Tf',
    '0.392 0.455 0.545 rg',
    '70 475 Td',
    '(Medical Department:) Tj',
    'ET',
    'BT',
    '/F1 11 Tf',
    '0.090 0.125 0.200 rg',
    '260 475 Td',
    `(${specialization}) Tj`,
    'ET',

    // Row 6: Date & Time
    'BT',
    '/F1 11 Tf',
    '0.392 0.455 0.545 rg',
    '70 445 Td',
    '(Appointment Schedule:) Tj',
    'ET',
    'BT',
    '/F2 11 Tf',
    '0.090 0.125 0.200 rg',
    '260 445 Td',
    `(${appointmentDate} at ${appointmentTime}) Tj`,
    'ET',

    // Row 7: Room / Suite
    'BT',
    '/F1 11 Tf',
    '0.392 0.455 0.545 rg',
    '70 415 Td',
    '(Consultation Suite:) Tj',
    'ET',
    'BT',
    '/F1 11 Tf',
    '0.090 0.125 0.200 rg',
    '260 415 Td',
    `(${roomNumber}) Tj`,
    'ET',

    // Row 8: Channel
    'BT',
    '/F1 11 Tf',
    '0.392 0.455 0.545 rg',
    '70 385 Td',
    '(Channel / Authorization:) Tj',
    'ET',
    'BT',
    '/F1 11 Tf',
    '0.090 0.125 0.200 rg',
    '260 385 Td',
    '(MediVoice AI Voice Assistant) Tj',
    'ET',

    // Clinical Guidelines Box
    'BT',
    '/F2 10 Tf',
    '0.090 0.125 0.200 rg',
    '50 320 Td',
    '(Patient Clinical Check-in Guidelines:) Tj',
    'ET',

    'BT',
    '/F1 9 Tf',
    '0.392 0.455 0.545 rg',
    '50 300 Td',
    '(1. Please arrive at the reception desk 10-15 minutes prior to your designated consultation slot.) Tj',
    'ET',

    'BT',
    '/F1 9 Tf',
    '0.392 0.455 0.545 rg',
    '50 282 Td',
    `(- Present this PDF slip or provide your confirmed telephone (${patientPhone}) at check-in.) Tj`,
    'ET',

    'BT',
    '/F1 9 Tf',
    '0.392 0.455 0.545 rg',
    '50 264 Td',
    '(- To reschedule or cancel, speak to MediVoice AI or contact clinic reception.) Tj',
    'ET',

    // Footer
    'BT',
    '/F1 8 Tf',
    '0.580 0.639 0.722 rg',
    '150 160 Td',
    `(${clinicName} - Automated HIPAA Compliant Slip - ${bookedAt}) Tj`,
    'ET'
  ];

  const streamContent = streamCommands.join('\n');
  const streamLength = streamContent.length;

  const objects = [
    `%PDF-1.4\n`,
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`,
    `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`
  ];

  // Calculate xref table offsets
  let offset = 0;
  const offsets: number[] = [];
  offsets.push(0); // 0th entry

  let pdfText = objects[0];
  offset = objects[0].length;

  for (let i = 1; i <= 6; i++) {
    offsets.push(offset);
    pdfText += objects[i];
    offset += objects[i].length;
  }

  const startxref = offset;
  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 1; i <= 6; i++) {
    const offStr = offsets[i].toString().padStart(10, '0');
    xref += `${offStr} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  pdfText += xref + trailer;

  return new Blob([pdfText], { type: 'application/pdf' });
};

/**
 * Downloads a true vector PDF file (.pdf)
 */
export const downloadAppointmentSlipPDF = (booking: BookingSuccessData) => {
  const blob = generateAppointmentSlipPDFBlob(booking);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MediVoice-Appointment-${booking.bookingId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const generateAppointmentSlipHTML = (booking: BookingSuccessData): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Appointment Confirmation Slip - ${booking.bookingId}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #172033;
      background: #FFFFFF;
      margin: 0;
      padding: 40px;
    }
    .slip-container {
      max-width: 600px;
      margin: 0 auto;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.06);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0D9488;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      color: #172033;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748B;
      margin: 2px 0 0 0;
    }
    .status-badge {
      background: #F0FDF4;
      color: #16A34A;
      border: 1px solid #BBF7D0;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .hero {
      text-align: center;
      margin-bottom: 28px;
    }
    .hero-title {
      font-size: 22px;
      font-weight: 700;
      color: #0F766E;
      margin: 0 0 6px 0;
    }
    .hero-desc {
      font-size: 13px;
      color: #64748B;
      margin: 0;
    }
    .receipt-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #F1F5F9;
      font-size: 13px;
    }
    .row:last-child {
      border-bottom: none;
    }
    .label {
      color: #64748B;
      font-weight: 500;
    }
    .value {
      color: #172033;
      font-weight: 600;
      text-align: right;
    }
    .value-teal {
      color: #0D9488;
      font-weight: 700;
    }
    .instructions {
      font-size: 11px;
      color: #64748B;
      line-height: 1.6;
      border-top: 1px solid #E2E8F0;
      padding-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 28px;
      font-size: 11px;
      color: #94A3B8;
    }
    @media print {
      body { padding: 0; background: none; }
      .slip-container { border: none; box-shadow: none; padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="header">
      <div>
        <h2 class="brand-title">MediVoice AI</h2>
        <p class="brand-sub">${booking.clinicName} • Outpatient Reception</p>
      </div>
      <div class="status-badge">Confirmed</div>
    </div>

    <div class="hero">
      <h1 class="hero-title">Appointment Confirmation Slip</h1>
      <p class="hero-desc">Your clinical voice booking was confirmed and registered.</p>
    </div>

    <div class="receipt-box">
      <div class="row">
        <span class="label">Booking Reference:</span>
        <span class="value value-teal">${booking.bookingId}</span>
      </div>
      <div class="row">
        <span class="label">Patient Name:</span>
        <span class="value">${booking.patientName || 'Verified Outpatient'}</span>
      </div>
      <div class="row">
        <span class="label">Patient Phone Number:</span>
        <span class="value">${booking.patientPhone}</span>
      </div>
      <div class="row">
        <span class="label">Attending Physician:</span>
        <span class="value">${booking.doctorName}</span>
      </div>
      <div class="row">
        <span class="label">Department / Specialization:</span>
        <span class="value">${booking.doctorSpecialization}</span>
      </div>
      <div class="row">
        <span class="label">Appointment Schedule:</span>
        <span class="value">${booking.appointmentDate} at ${booking.appointmentTime}</span>
      </div>
      <div class="row">
        <span class="label">Consultation Suite:</span>
        <span class="value">${booking.roomNumber || 'Clinic Wing B'}</span>
      </div>
      <div class="row">
        <span class="label">Channel:</span>
        <span class="value">MediVoice Conversational AI</span>
      </div>
    </div>

    <div class="instructions">
      <p><strong>Clinical Check-in Guidelines:</strong></p>
      <ul>
        <li>Please arrive at the clinic 10-15 minutes prior to your scheduled consultation time.</li>
        <li>Present this confirmation slip or provide your confirmed phone number (<strong>${booking.patientPhone}</strong>) at the reception kiosk.</li>
        <li>To reschedule or cancel your slot automatically, call the MediVoice AI line at any time.</li>
      </ul>
    </div>

    <div class="footer">
      Generated automatically by MediVoice AI Clinical Engine • ${booking.bookedAt}
    </div>
  </div>
</body>
</html>`;
};

export const printAppointmentSlip = (booking: BookingSuccessData) => {
  const printWindow = window.open('', '_blank', 'width=750,height=800');
  if (!printWindow) {
    alert('Please allow popups to print the appointment slip.');
    return;
  }
  const html = generateAppointmentSlipHTML(booking);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
};
