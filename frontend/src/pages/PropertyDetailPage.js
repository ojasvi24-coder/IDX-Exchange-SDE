import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchOpenHouses, fetchPropertyDetail } from '../api/client';
import OpenHouseList from '../components/OpenHouseList';
import PropertyImageGallery from '../components/PropertyImageGallery';
import PropertyMap from '../components/PropertyMap';
import {
  formatAddress, formatBaths, formatBeds, formatPrice, formatSqft,
} from '../utils/format';

const present = (v) => v !== null && v !== undefined && String(v).trim() !== '';
// MLS Y/N columns are stored as '1' / '0' / '' / NULL.
const yesNo = (v) => {
  if (v === 1 || v === '1' || v === 'Y' || v === true) return 'Yes';
  if (v === 0 || v === '0' || v === 'N' || v === false) return 'No';
  return null;
};

function buildDetailRows(p) {
  return [
    ['Property type', p.L_Type_],
    ['Status', p.L_Status],
    ['Year built', p.YearBuilt],
    ['Lot size', present(p.LotSizeAcres) && Number(p.LotSizeAcres) > 0 ? `${Number(p.LotSizeAcres)} acres` : null],
    ['Stories', p.StoriesTotal],
    ['Garage spaces', p.L_Keyword5],
    ['Pool', yesNo(p.PoolPrivateYN)],
    ['View', yesNo(p.ViewYN)],
    ['Fireplace', yesNo(p.FireplaceYN)],
    ['Cooling', p.Cooling],
    ['Heating', p.Heating],
    ['Flooring', p.Flooring],
    ['Subdivision', p.SubdivisionName],
    ['HOA fee', present(p.AssociationFee) && Number(p.AssociationFee) > 0
      ? `$${Number(p.AssociationFee).toLocaleString('en-US')}${p.AssociationFeeFrequency ? ` / ${p.AssociationFeeFrequency}` : ''}`
      : null],
    ['Days on market', p.DaysOnMarket],
    ['Listing agent', p.ListAgentFullName],
    ['Brokerage', p.LO1_OrganizationName],
  ].filter(([, value]) => present(value));
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [property, setProperty] = useState({ status: 'loading', data: null, error: null });
  const [openHouses, setOpenHouses] = useState({ status: 'loading', data: [], error: null });

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    setProperty({ status: 'loading', data: null, error: null });
    setOpenHouses({ status: 'loading', data: [], error: null });

    fetchPropertyDetail(id, options)
      .then((data) => {
        if (!controller.signal.aborted) setProperty({ status: 'success', data, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === 'AbortError') return;
        setProperty({ status: 'error', data: null, error: err });
      });

    fetchOpenHouses(id, options)
      .then((data) => {
        if (!controller.signal.aborted) setOpenHouses({ status: 'success', data, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === 'AbortError') return;
        // A 404 just means the property is unknown; the main error state covers that.
        setOpenHouses({ status: 'error', data: [], error: err.message });
      });

    return () => controller.abort();
  }, [id]);

  // Prefer real history so filters/page are restored; fall back to "/" when the
  // detail page was opened directly (no previous entry in this app).
  const handleBack = (event) => {
    if (location.key !== 'default') {
      event.preventDefault();
      navigate(-1);
    }
  };
  const back = <Link to="/" className="detail__back" onClick={handleBack}>← Back to listings</Link>;

  if (property.status === 'loading') return <p role="status" className="message">Loading property…</p>;

  if (property.status === 'error') {
    const notFound = property.error.status === 404 || property.error.status === 400;
    return (
      <section>
        {back}
        <div role="alert" className="message message--error">
          {notFound ? `Property "${id}" could not be found.` : property.error.message}
        </div>
      </section>
    );
  }

  const p = property.data;
  const { street, locality } = formatAddress(p);
  const facts = [
    formatBeds(p.L_Keyword2), formatBaths(p.LM_Dec_3), formatSqft(p.LM_Int2_3),
    present(p.YearBuilt) ? `Built ${p.YearBuilt}` : null,
  ].filter(Boolean);
  const rows = buildDetailRows(p);

  return (
    <article className="detail">
      {back}
      <div className="detail__layout">
        <div>
          <PropertyImageGallery rawPhotos={p.L_Photos} alt={`Photo of ${street}`} />
        </div>
        <div>
          <p className="detail__price">{formatPrice(p.L_SystemPrice)}</p>
          <h1 className="detail__address">{[street, locality].filter(Boolean).join(', ')}</h1>
          {facts.length > 0 && (
            <ul className="detail__facts">
              {facts.map((fact) => <li key={fact}>{fact}</li>)}
            </ul>
          )}
          <PropertyMap latitude={p.LMD_MP_Latitude} longitude={p.LMD_MP_Longitude} address={street} />
        </div>
      </div>

      <section className="detail__section">
        <h2>Description</h2>
        <p className="detail__remarks">{present(p.L_Remarks) ? p.L_Remarks : 'No description provided.'}</p>
      </section>

      {rows.length > 0 && (
        <section className="detail__section">
          <h2>Property details</h2>
          <table className="facts-table">
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}><th scope="row">{label}</th><td>{String(value)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="detail__section">
        <h2>Open houses</h2>
        {openHouses.status === 'loading' && <p role="status">Loading open houses…</p>}
        {openHouses.status === 'error' && <p role="alert">Could not load open houses: {openHouses.error}</p>}
        {openHouses.status === 'success' && <OpenHouseList openHouses={openHouses.data} />}
      </section>
    </article>
  );
}
