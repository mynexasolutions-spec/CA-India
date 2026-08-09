import { Route, Routes, Navigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import HtmlPage from './components/HtmlPage';
import { AdminPortalLayout, AdminBillingLayout, ClientPortalLayout, ClientBillingLayout, ClientReportsLayout, RequireAuth } from './components/portal/PortalShell';
import AdminBillingClientPicker from './pages/admin/AdminBillingClientPicker';
import ClientsUnlockGate from './pages/admin/ClientsUnlockGate';
import { PAGE_SLUGS } from './data/nav';
import HomePage from './pages/marketing/HomePage';
import BillingManagement from './pages/marketing/BillingManagement';
import KnowledgeCentre from './pages/marketing/KnowledgeCentre';
import ArticleDetail from './pages/marketing/ArticleDetail';
import DueDates from './pages/marketing/DueDates';
import { CookiePolicy, PrivacyPolicy, TermsAndConditions } from './pages/marketing/LegalPages';
import NotFound from './pages/marketing/NotFound';
import LoginPage from './pages/marketing/LoginPage';
import ResetPasswordPage from './pages/marketing/ResetPasswordPage';
import {
  ClientDashboard,
  ClientProfile,
} from './pages/portal/ClientPages';
import BillingDashboard from './pages/billing/BillingDashboard';
import PartiesPage from './pages/billing/PartiesPage';
import InvoiceForm from './pages/billing/InvoiceForm';
import InvoiceList from './pages/billing/InvoiceList';
import InvoiceDetail from './pages/billing/InvoiceDetail';
import BillingReports from './pages/billing/BillingReports';
import OutstandingPage from './pages/billing/OutstandingPage';
import GstSummaryPage from './pages/billing/GstSummaryPage';
import BusinessSettings from './pages/billing/BusinessSettings';
import ReportsIndexRedirect from './pages/billing/ReportsIndexRedirect';
import EditRequestPage from './pages/portal/EditRequestPage';
import AmendmentsPage from './pages/portal/AmendmentsPage';
import { AdminEditRequestList, AdminEditRequestDetail } from './pages/admin/AdminEditRequests';
import AdminSettings from './pages/admin/AdminSettings';
import AdminOverview from './pages/admin/AdminOverview';
import AdminClients from './pages/admin/AdminClients';
import ClientProfileForm from './pages/admin/ClientProfileForm';
import AdminClientBilling from './pages/admin/AdminClientBilling';
import { AdminChangeRequestList, AdminChangeRequestDetail } from './pages/admin/AdminChangeRequests';
import {
  AdminActivity,
  AdminAppointments,
  AdminArticles,
  AdminCompliance,
  AdminDueDates,
  AdminEnquiries,
  AdminStaff,
} from './pages/admin/AdminPages';
import {
  AdminBillingDashboard,
  AdminBillingInvoices,
  AdminBillingReports,
  AdminGstSummary,
  AdminHsnSummary,
  AdminInvoiceDetail,
} from './pages/admin/AdminBillingPages';

function Page({ path }) {
  const slug = PAGE_SLUGS[path];
  return <HtmlPage slug={slug} />;
}

function PendingApprovalIdRedirect() {
  const { id } = useParams();
  return <Navigate to={`/admin/pending-approval/${id}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<Page path="/about" />} />
        <Route path="/services" element={<Page path="/services" />} />
        <Route path="/contact" element={<Page path="/contact" />} />
        <Route path="/business-registration" element={<Page path="/business-registration" />} />
        <Route path="/billing-management" element={<BillingManagement />} />
        <Route path="/knowledge-centre" element={<KnowledgeCentre />} />
        <Route path="/knowledge-centre/due-dates" element={<DueDates />} />
        <Route path="/knowledge-centre/:slug" element={<ArticleDetail />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/portal/login" element={<LoginPage portal="client" />} />
        <Route path="/admin/login" element={<LoginPage portal="admin" />} />
        <Route path="/portal/reset-password" element={<ResetPasswordPage />} />

        <Route path="/services/accounting" element={<Page path="/services/accounting" />} />
        <Route path="/services/audit" element={<Page path="/services/audit" />} />
        <Route path="/services/income-tax" element={<Page path="/services/income-tax" />} />
        <Route path="/services/gst" element={<Page path="/services/gst" />} />
        <Route path="/services/roc-compliance" element={<Page path="/services/roc-compliance" />} />
        <Route path="/services/payroll" element={<Page path="/services/payroll" />} />
        <Route path="/services/financial-advisory" element={<Page path="/services/financial-advisory" />} />
        <Route path="/services/business-consultancy" element={<Page path="/services/business-consultancy" />} />
        <Route path="/services/virtual-cfo" element={<Page path="/services/virtual-cfo" />} />

        <Route path="/business-registration/proprietorship" element={<Page path="/business-registration/proprietorship" />} />
        <Route path="/business-registration/partnership-firm" element={<Page path="/business-registration/partnership-firm" />} />
        <Route path="/business-registration/llp" element={<Page path="/business-registration/llp" />} />
        <Route path="/business-registration/private-limited" element={<Page path="/business-registration/private-limited" />} />
        <Route path="/business-registration/public-limited" element={<Page path="/business-registration/public-limited" />} />
        <Route path="/business-registration/one-person-company" element={<Page path="/business-registration/one-person-company" />} />
        <Route path="/business-registration/trust" element={<Page path="/business-registration/trust" />} />
        <Route path="/business-registration/section-8" element={<Page path="/business-registration/section-8" />} />
        <Route path="/business-registration/msme" element={<Page path="/business-registration/msme" />} />
        <Route path="/business-registration/iec" element={<Page path="/business-registration/iec" />} />
        <Route path="/business-registration/dsc" element={<Page path="/business-registration/dsc" />} />
        <Route path="/business-registration/trademark" element={<Page path="/business-registration/trademark" />} />

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<RequireAuth roles={['client']} />}>
        <Route path="/portal" element={<ClientPortalLayout />}>
          <Route index element={<ClientDashboard />} />
          <Route path="profile" element={<ClientProfile />} />
          <Route path="quotation">
            <Route index element={<InvoiceList type="quotation" title="Quotations" newPath="/portal/quotation/new" />} />
            <Route path="new" element={<InvoiceForm docType="quotation" title="Create Quotation" />} />
            <Route path=":id" element={<InvoiceDetail />} />
            <Route path=":id/edit" element={<InvoiceForm docType="quotation" title="Edit Quotation" />} />
          </Route>
          <Route path="edit-requests" element={<EditRequestPage />} />
          <Route path="amendments">
            <Route index element={<AmendmentsPage />} />
            <Route path="new" element={<InvoiceForm docType="amendment" title="Create Amendment" />} />
            <Route path=":id" element={<InvoiceDetail />} />
            <Route path=":id/edit" element={<InvoiceForm docType="amendment" title="Edit Amendment" />} />
          </Route>
          <Route path="billing/parties" element={<PartiesPage />} />
          <Route path="billing" element={<ClientBillingLayout />}>
            <Route index element={<BillingDashboard />} />
            <Route path="quotations" element={<Navigate to="/portal/quotation" replace />} />
            <Route path="quotations/*" element={<Navigate to="/portal/quotation" replace />} />
            <Route path="invoices" element={<InvoiceList type="tax_invoice" title="Tax Invoices" newPath="/portal/billing/invoices/new" />} />
            <Route path="invoices/new" element={<InvoiceForm docType="tax_invoice" title="Create Tax Invoice" />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="invoices/:id/edit" element={<InvoiceForm docType="tax_invoice" title="Edit Tax Invoice" />} />
            <Route path="debit-notes" element={<InvoiceList type="debit_note" title="Debit Note" newPath="/portal/billing/debit-notes/new" createLabel="+ Create Debit Note" />} />
            <Route path="debit-notes/new" element={<InvoiceForm docType="debit_note" title="Create Debit Note" />} />
            <Route path="debit-notes/:id" element={<InvoiceDetail />} />
            <Route path="debit-notes/:id/edit" element={<InvoiceForm docType="debit_note" title="Edit Debit Note" />} />
            <Route path="credit-notes" element={<InvoiceList type="credit_note" title="Credit Note" newPath="/portal/billing/credit-notes/new" createLabel="+ Create Credit Note" />} />
            <Route path="credit-notes/new" element={<InvoiceForm docType="credit_note" title="Create Credit Note" />} />
            <Route path="credit-notes/:id" element={<InvoiceDetail />} />
            <Route path="credit-notes/:id/edit" element={<InvoiceForm docType="credit_note" title="Edit Credit Note" />} />
            <Route path="bill-of-supply" element={<InvoiceList type="bill_of_supply" title="Bill of Supply" newPath="/portal/billing/bill-of-supply/new" />} />
            <Route path="bill-of-supply/new" element={<InvoiceForm docType="bill_of_supply" title="Create Bill of Supply" />} />
            <Route path="bill-of-supply/:id" element={<InvoiceDetail />} />
            <Route path="bill-of-supply/:id/edit" element={<InvoiceForm docType="bill_of_supply" title="Edit Bill of Supply" />} />
            <Route path="settings" element={<Navigate to="/portal/settings" replace />} />
            <Route path="reports" element={<Navigate to="/portal/reports" replace />} />
          </Route>
          <Route path="settings" element={<BusinessSettings />} />
          <Route path="reports" element={<ClientReportsLayout />}>
            <Route index element={<ReportsIndexRedirect />} />
            <Route path="gst-summary" element={<GstSummaryPage />} />
            <Route path="hsn-summary" element={<BillingReports defaultType="hsn_summary" title="HSN / SAC Summary" />} />
            <Route path="party-wise" element={<BillingReports defaultType="party_wise_sales" title="Party-wise Detail" />} />
            <Route path="sales-register" element={<BillingReports defaultType="sales_register" title="Sales Register" />} />
            <Route path="outstanding" element={<OutstandingPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<RequireAuth roles={['super_admin', 'admin', 'staff']} />}>
        <Route path="/admin" element={<AdminPortalLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="clients" element={<ClientsUnlockGate />}>
            <Route index element={<AdminClients />} />
            <Route path="new" element={<ClientProfileForm />} />
            <Route path=":id/edit" element={<ClientProfileForm />} />
          </Route>
          <Route path="clients/:id/billing" element={<AdminClientBilling />} />
          <Route path="billing" element={<AdminBillingClientPicker />} />
          <Route path="edit-requests" element={<AdminEditRequestList />} />
          <Route path="edit-requests/:id" element={<AdminEditRequestDetail />} />
          <Route path="pending-approval" element={<AdminChangeRequestList />} />
          <Route path="pending-approval/:id" element={<AdminChangeRequestDetail />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="change-requests" element={<Navigate to="/admin/pending-approval" replace />} />
          <Route path="change-requests/:id" element={<PendingApprovalIdRedirect />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="enquiries" element={<AdminEnquiries />} />
          <Route path="articles" element={<AdminArticles />} />
          <Route path="due-dates" element={<AdminDueDates />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="compliance" element={<AdminCompliance />} />
          <Route path="activity" element={<AdminActivity />} />
        </Route>
        <Route path="/admin/firm-billing" element={<AdminBillingLayout />}>
          <Route index element={<AdminBillingDashboard />} />
          <Route path="invoices" element={<AdminBillingInvoices type="tax_invoice" title="Tax Invoice/Bill of Supply" />} />
          <Route path="invoices/:id" element={<AdminInvoiceDetail />} />
          <Route path="debit-notes" element={<AdminBillingInvoices type="debit_note" title="Debit Notes" />} />
          <Route path="debit-notes/:id" element={<AdminInvoiceDetail />} />
          <Route path="credit-notes" element={<AdminBillingInvoices type="credit_note" title="Credit Notes" />} />
          <Route path="credit-notes/:id" element={<AdminInvoiceDetail />} />
          <Route path="reports" element={<AdminBillingReports />} />
          <Route path="gst-summary" element={<AdminGstSummary />} />
          <Route path="hsn-summary" element={<AdminHsnSummary />} />
        </Route>
      </Route>
    </Routes>
  );
}
