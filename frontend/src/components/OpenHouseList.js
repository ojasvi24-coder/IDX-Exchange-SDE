import PropTypes from 'prop-types';
import { formatDate, formatTime } from '../utils/format';
import { parseOpenHouseRemarks } from '../utils/openHouse';

export default function OpenHouseList({ openHouses }) {
  if (openHouses.length === 0) return <p>No open houses scheduled</p>;

  return (
    <ul className="openhouses">
      {openHouses.map((oh) => {
        // OpenHouseRemarks lives inside the all_data JSON blob, not a column.
        const remarks = parseOpenHouseRemarks(oh.all_data);
        const start = formatTime(oh.OH_StartTime);
        const end = formatTime(oh.OH_EndTime);
        return (
          <li key={oh.id}>
            <p className="openhouses__when">
              {formatDate(oh.OpenHouseDate)}
              {start && `, ${start}`}
              {end && ` – ${end}`}
            </p>
            {remarks && <p className="openhouses__remarks">{remarks}</p>}
          </li>
        );
      })}
    </ul>
  );
}

OpenHouseList.propTypes = {
  openHouses: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    OpenHouseDate: PropTypes.string,
    OH_StartTime: PropTypes.string,
    OH_EndTime: PropTypes.string,
    all_data: PropTypes.string,
  })).isRequired,
};
