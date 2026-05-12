/**
 * Seed: Creates the demo "Invoice Management" app configuration.
 * Run: node src/db/seed.js
 */
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const DEMO_APP_ID = 'app-demo-001';

const demoConfig = {
  app_id: DEMO_APP_ID,
  name: 'Invoice Management',
  api_bindings: {
    base_url: 'http://localhost:3002/mock',
    endpoints: [
      { id: 'list_invoices',  path: '/invoices',       method: 'GET'    },
      { id: 'get_invoice',    path: '/invoices/:id',   method: 'GET'    },
      { id: 'create_invoice', path: '/invoices',       method: 'POST'   },
      { id: 'update_invoice', path: '/invoices/:id',   method: 'PUT'    },
      { id: 'delete_invoice', path: '/invoices/:id',   method: 'DELETE' }
    ]
  },
  ui: {
    sidebar: [
      { label: 'Dashboard',  icon: 'LayoutDashboard', view_id: 'view-dashboard' },
      { label: 'Invoices',   icon: 'FileText',        view_id: 'view-invoices'  },
      { label: 'New Invoice',icon: 'PlusCircle',      view_id: 'view-new-invoice'}
    ],
    views: [
      {
        id: 'view-dashboard',
        type: 'dashboard',
        title: 'Overview',
        components: [
          { type: 'StatCard', id: 'stat-total',   label: 'Total Invoices',  api_binding: 'list_invoices', aggregate: 'count' },
          { type: 'StatCard', id: 'stat-pending', label: 'Pending',         api_binding: 'list_invoices', aggregate: 'count', filter: { status: 'pending' } },
          { type: 'StatCard', id: 'stat-paid',    label: 'Paid This Month', api_binding: 'list_invoices', aggregate: 'count', filter: { status: 'paid'    } },
          {
            type: 'DataTable',
            id: 'tbl-recent',
            title: 'Recent Invoices',
            api_binding: 'list_invoices',
            columns: [
              { key: 'id',         label: 'Invoice #'    },
              { key: 'client',     label: 'Client'       },
              { key: 'amount',     label: 'Amount',   format: 'currency' },
              { key: 'status',     label: 'Status',   format: 'badge'    },
              { key: 'due_date',   label: 'Due Date', format: 'date'     }
            ],
            row_action: { type: 'navigate', target_view: 'view-invoice-detail', param: 'id' }
          }
        ]
      },
      {
        id: 'view-invoices',
        type: 'list',
        title: 'All Invoices',
        components: [
          {
            type: 'DataTable',
            id: 'tbl-all-invoices',
            api_binding: 'list_invoices',
            searchable: true,
            filterable: ['status'],
            columns: [
              { key: 'id',       label: 'Invoice #'  },
              { key: 'client',   label: 'Client'     },
              { key: 'amount',   label: 'Amount',  format: 'currency' },
              { key: 'status',   label: 'Status',  format: 'badge'    },
              { key: 'due_date', label: 'Due Date',format: 'date'     }
            ],
            row_action: { type: 'navigate', target_view: 'view-invoice-detail', param: 'id' }
          }
        ]
      },
      {
        id: 'view-invoice-detail',
        type: 'detail',
        title: 'Invoice Detail',
        api_binding: 'get_invoice',
        components: [
          {
            type: 'DetailCard',
            id: 'detail-main',
            fields: [
              { key: 'id',         label: 'Invoice #'    },
              { key: 'client',     label: 'Client'       },
              { key: 'amount',     label: 'Amount',   format: 'currency' },
              { key: 'status',     label: 'Status',   format: 'badge'    },
              { key: 'due_date',   label: 'Due Date', format: 'date'     },
              { key: 'notes',      label: 'Notes'        }
            ]
          }
        ]
      },
      {
        id: 'view-new-invoice',
        type: 'form',
        title: 'New Invoice',
        api_binding: 'create_invoice',
        on_success: { navigate_to: 'view-invoices' },
        components: [
          {
            type: 'Form',
            id: 'form-new-invoice',
            fields: [
              { key: 'client',   label: 'Client Name', type: 'text',     required: true },
              { key: 'amount',   label: 'Amount ($)',   type: 'number',   required: true },
              { key: 'due_date', label: 'Due Date',     type: 'date',     required: true },
              { key: 'status',   label: 'Status',       type: 'select',   required: true,
                options: ['pending', 'paid', 'overdue'] },
              { key: 'notes',    label: 'Notes',        type: 'textarea', required: false }
            ],
            submit_label: 'Create Invoice'
          }
        ]
      }
    ]
  },
  workflows: {
    routing: [
      { from: 'view-dashboard',   to: 'view-invoice-detail', trigger: 'row_click_tbl-recent' },
      { from: 'view-invoices',    to: 'view-invoice-detail', trigger: 'row_click_tbl-all-invoices' },
      { from: 'view-new-invoice', to: 'view-invoices',       trigger: 'form_submit_success' }
    ]
  }
};

// Clear existing and re-seed
const existing = db.prepare('SELECT app_id FROM apps WHERE app_id = ?').get(DEMO_APP_ID);
if (existing) {
  db.prepare('DELETE FROM mutations WHERE app_id = ?').run(DEMO_APP_ID);
  db.prepare('DELETE FROM app_versions WHERE app_id = ?').run(DEMO_APP_ID);
  db.prepare('DELETE FROM apps WHERE app_id = ?').run(DEMO_APP_ID);
  console.log('Cleared existing demo app.');
}

db.prepare('INSERT INTO apps (app_id, name, config, version) VALUES (?, ?, ?, 1)').run(
  DEMO_APP_ID, demoConfig.name, JSON.stringify(demoConfig)
);
db.prepare('INSERT INTO app_versions (app_id, version, config) VALUES (?, 1, ?)').run(
  DEMO_APP_ID, JSON.stringify(demoConfig)
);

// Seed a sample pending mutation (AI-suggested shortcut button)
const mutation_id = `mut-${uuidv4().slice(0, 8)}`;
const samplePatch = [
  {
    op: 'add',
    path: '/ui/views/0/components/3/shortcut_button',
    value: {
      label: 'Quick Export CSV',
      action: 'export_csv',
      icon: 'Download'
    }
  }
];
db.prepare(
  'INSERT INTO mutations (mutation_id, app_id, title, description, patch, source) VALUES (?, ?, ?, ?, ?, ?)'
).run(
  mutation_id,
  DEMO_APP_ID,
  'Add Quick Export shortcut to Dashboard',
  '87% of users navigate from Dashboard → Invoices → Export within 30 seconds. Adding a shortcut reduces 2 navigation steps.',
  JSON.stringify(samplePatch),
  'ai'
);

console.log(`✅ Seeded demo app: ${DEMO_APP_ID}`);
console.log(`✅ Seeded pending AI mutation: ${mutation_id}`);
process.exit(0);
