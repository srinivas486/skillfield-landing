require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Storage helper functions
function readJSON(filepath) {
  try {
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

// File paths
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const EMAILS_FILE = path.join(DATA_DIR, 'emails.json');
const CALENDAR_FILE = path.join(DATA_DIR, 'calendar.json');

// ============================================
// Leads API
// ============================================

// POST /api/leads - Create a new lead
app.post('/api/leads', (req, res) => {
  try {
    const { name, company, email, phone, useCases } = req.body;

    if (!name || !company || !email) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields: name, company, email',
          details: { name: !!name, company: !!company, email: !!email }
        }
      });
    }

    const leads = readJSON(LEADS_FILE);
    const newLead = {
      id: uuidv4(),
      name,
      company,
      email,
      phone: phone || null,
      useCases: useCases || [],
      createdAt: new Date().toISOString()
    };

    leads.push(newLead);
    writeJSON(LEADS_FILE, leads);

    res.status(201).json({ data: newLead });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to create lead', details: err.message } });
  }
});

// GET /api/leads/:id - Get lead by ID
app.get('/api/leads/:id', (req, res) => {
  try {
    const leads = readJSON(LEADS_FILE);
    const lead = leads.find(l => l.id === req.params.id);

    if (!lead) {
      return res.status(404).json({ error: { message: 'Lead not found' } });
    }

    res.json({ data: lead });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch lead', details: err.message } });
  }
});

// ============================================
// Emails API
// ============================================

// Generate email content
function generateEmailContent(lead, useCases) {
  const useCasesList = useCases.map(uc => `- ${uc}`).join('\n');

  const subject = `Skillfield: Your ${useCases[0] || 'Security'} Solutions Overview`;

  const body = `# Your Personalized Security Solutions

Hi ${lead.name},

Thank you for your interest in Skillfield's ${useCases.join(', ') || 'security solutions'} for ${lead.company}.

## Your Requirements
Based on your interest, we believe the following solutions would be most valuable:

${useCasesList}

## Next Steps
I'd love to schedule a discovery session to understand your specific challenges and demonstrate how we've helped similar organizations.

Please let me know a time that works for you, or feel free to book directly through our calendar.

Best regards,
The Skillfield Team`;

  return { subject, body };
}

// POST /api/emails - Create a personalized email
app.post('/api/emails', (req, res) => {
  try {
    const { leadId, useCases } = req.body;

    if (!leadId || !useCases || !Array.isArray(useCases) || useCases.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields: leadId, useCases (array)',
          details: { leadId: !!leadId, useCases: !!useCases }
        }
      });
    }

    const leads = readJSON(LEADS_FILE);
    const lead = leads.find(l => l.id === leadId);

    if (!lead) {
      return res.status(404).json({ error: { message: 'Lead not found' } });
    }

    const { subject, body } = generateEmailContent(lead, useCases);

    const emails = readJSON(EMAILS_FILE);
    const newEmail = {
      id: uuidv4(),
      leadId,
      subject,
      body,
      bodyHtml: marked(body),
      useCases,
      createdAt: new Date().toISOString()
    };

    emails.push(newEmail);
    writeJSON(EMAILS_FILE, emails);

    res.status(201).json({ data: newEmail });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to create email', details: err.message } });
  }
});

// GET /api/emails/:id - Get email by ID
app.get('/api/emails/:id', (req, res) => {
  try {
    const emails = readJSON(EMAILS_FILE);
    const email = emails.find(e => e.id === req.params.id);

    if (!email) {
      return res.status(404).json({ error: { message: 'Email not found' } });
    }

    res.json({ data: email });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch email', details: err.message } });
  }
});

// GET /api/emails?leadId= - List emails filtered by leadId
app.get('/api/emails', (req, res) => {
  try {
    const { leadId } = req.query;
    const emails = readJSON(EMAILS_FILE);

    if (leadId) {
      const filtered = emails.filter(e => e.leadId === leadId);
      return res.json({ data: filtered });
    }

    res.json({ data: emails });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch emails', details: err.message } });
  }
});

// ============================================
// Calendar API
// ============================================

// POST /api/calendar - Create a calendar event
app.post('/api/calendar', (req, res) => {
  try {
    const { leadId, type, title, date, emailId, meetingDetails } = req.body;

    if (!leadId || !type || !title || !date) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields: leadId, type, title, date',
          details: { leadId: !!leadId, type: !!type, title: !!title, date: !!date }
        }
      });
    }

    const validTypes = ['email_sent', 'meeting_invite'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: {
          message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
          details: { type }
        }
      });
    }

    const leads = readJSON(LEADS_FILE);
    const lead = leads.find(l => l.id === leadId);

    if (!lead) {
      return res.status(404).json({ error: { message: 'Lead not found' } });
    }

    const calendar = readJSON(CALENDAR_FILE);
    const newEvent = {
      id: uuidv4(),
      leadId,
      type,
      title,
      date,
      emailId: emailId || null,
      meetingDetails: type === 'meeting_invite' ? {
        attendees: [lead.name],
        agenda: 'Discovery session',
        zoomLink: null,
        ...meetingDetails
      } : null,
      createdAt: new Date().toISOString()
    };

    calendar.push(newEvent);
    writeJSON(CALENDAR_FILE, calendar);

    res.status(201).json({ data: newEvent });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to create calendar event', details: err.message } });
  }
});

// GET /api/calendar - Get all calendar events
app.get('/api/calendar', (req, res) => {
  try {
    const calendar = readJSON(CALENDAR_FILE);
    res.json({ data: calendar });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch calendar events', details: err.message } });
  }
});

// GET /api/calendar/:id - Get calendar event by ID
app.get('/api/calendar/:id', (req, res) => {
  try {
    const calendar = readJSON(CALENDAR_FILE);
    const event = calendar.find(e => e.id === req.params.id);

    if (!event) {
      return res.status(404).json({ error: { message: 'Calendar event not found' } });
    }

    // For email_sent, include the full email
    // For meeting_invite, include the full lead + their email history
    let enrichedEvent = { ...event };

    if (event.type === 'email_sent' && event.emailId) {
      const emails = readJSON(EMAILS_FILE);
      const email = emails.find(e => e.id === event.emailId);
      if (email) {
        enrichedEvent.email = email;
      }
    }

    if (event.type === 'meeting_invite') {
      const leads = readJSON(LEADS_FILE);
      const lead = leads.find(l => l.id === event.leadId);
      if (lead) {
        const emails = readJSON(EMAILS_FILE);
        const leadEmails = emails.filter(e => e.leadId === event.leadId);
        enrichedEvent.lead = lead;
        enrichedEvent.emailHistory = leadEmails;
      }
    }

    res.json({ data: enrichedEvent });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch calendar event', details: err.message } });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Skillfield Field App running on http://localhost:${PORT}`);
});
