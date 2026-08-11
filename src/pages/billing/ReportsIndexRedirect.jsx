import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { isRetail } from '../billing/billingProfile';

/** Default reports landing: GST Summary for GST clients, Party-wise Detail for non-GST. */
export default function ReportsIndexRedirect() {
  const { user } = useAuth();
  const retail = isRetail(user?.client_profile);
  return <Navigate to={retail ? '/portal/reports/party-wise' : '/portal/reports/gst-summary'} replace />;
}
