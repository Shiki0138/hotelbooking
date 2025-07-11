import { Router } from 'express';
import { Request, Response } from 'express';
import { groupBookingService } from '../services/groupBookingService';
import { auth } from '../middleware/auth';

const router = Router();

// Corporate Account Management
router.post('/corporate-accounts', auth, async (req: Request, res: Response) => {
  try {
    const account = await groupBookingService.createCorporateAccount(req.body);
    res.json({ success: true, data: account });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/corporate-accounts/:id', auth, async (req: Request, res: Response) => {
  try {
    const account = await groupBookingService.getCorporateAccount(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    res.json({ success: true, data: account });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/corporate-accounts/:id', auth, async (req: Request, res: Response) => {
  try {
    const account = await groupBookingService.updateCorporateAccount(req.params.id, req.body);
    res.json({ success: true, data: account });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/corporate-accounts/:id/users', auth, async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;
    const user = await groupBookingService.addCorporateUser(req.params.id, userId, role);
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Group Bookings
router.post('/bookings', auth, async (req: Request, res: Response) => {
  try {
    const booking = await groupBookingService.createGroupBooking({
      ...req.body,
      organizer_user_id: req.user?.id
    });
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/bookings/:id', auth, async (req: Request, res: Response) => {
  try {
    const booking = await groupBookingService.getGroupBooking(req.params.id);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/bookings/:id', auth, async (req: Request, res: Response) => {
  try {
    const booking = await groupBookingService.updateGroupBooking(req.params.id, req.body);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/bookings/:id/confirm', auth, async (req: Request, res: Response) => {
  try {
    const booking = await groupBookingService.confirmGroupBooking(req.params.id);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/bookings/:id/cancel', auth, async (req: Request, res: Response) => {
  try {
    const booking = await groupBookingService.cancelGroupBooking(req.params.id);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Room Assignment
router.post('/bookings/:id/rooms', auth, async (req: Request, res: Response) => {
  try {
    const rooms = await groupBookingService.assignRooms(req.params.id, req.body.rooms);
    res.json({ success: true, data: rooms });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Guest Management
router.post('/bookings/:id/guests', auth, async (req: Request, res: Response) => {
  try {
    const guests = await groupBookingService.addGuests(req.params.id, req.body.guests);
    res.json({ success: true, data: guests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/guests/:id', auth, async (req: Request, res: Response) => {
  try {
    const guest = await groupBookingService.updateGuest(req.params.id, req.body);
    res.json({ success: true, data: guest });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/guests/:id/check-in', auth, async (req: Request, res: Response) => {
  try {
    const guest = await groupBookingService.checkInGuest(req.params.id);
    res.json({ success: true, data: guest });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pricing
router.post('/pricing/calculate', auth, async (req: Request, res: Response) => {
  try {
    const { hotelId, rooms, checkIn, checkOut, corporateAccountId } = req.body;
    const pricing = await groupBookingService.calculateGroupPricing(
      hotelId,
      rooms,
      checkIn,
      checkOut,
      corporateAccountId
    );
    res.json({ success: true, data: pricing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Invoicing
router.post('/invoices', auth, async (req: Request, res: Response) => {
  try {
    const { corporateAccountId, bookingIds, groupBookingIds } = req.body;
    const invoice = await groupBookingService.createCorporateInvoice(
      corporateAccountId,
      bookingIds || [],
      groupBookingIds || []
    );
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Policies
router.post('/corporate-accounts/:id/policies', auth, async (req: Request, res: Response) => {
  try {
    const { policyName, policyType, rules } = req.body;
    const policy = await groupBookingService.createBookingPolicy(
      req.params.id,
      policyName,
      policyType,
      rules
    );
    res.json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/corporate-accounts/:id/check-policy', auth, async (req: Request, res: Response) => {
  try {
    const result = await groupBookingService.checkBookingPolicy(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search
router.get('/bookings', auth, async (req: Request, res: Response) => {
  try {
    const bookings = await groupBookingService.searchGroupBookings(req.query as any);
    res.json({ success: true, data: bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/corporate-accounts/:id/history', auth, async (req: Request, res: Response) => {
  try {
    const history = await groupBookingService.getCorporateBookingHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;