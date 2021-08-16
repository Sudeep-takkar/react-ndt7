import { Icon, makeStyles } from '@material-ui/core'
import GoogleMapReact from 'google-map-react';

const useStyles = makeStyles(() => ({
    markerIcon: {
        position: 'absolute',
        transform: 'translate(-50%, -50%)'

    },
    map: { 
        height: '200px', 
        width: '300px' 
    }
}));

const MarkerComponent = ({ location, lat, lng, markerIcon }) => <Icon lat={lat}
    lng={lng} fontSize="large" color="primary" title={location} className={markerIcon}>place</Icon>;

function GoogleMap({ coords, location }) {
    const classes = useStyles();
    return (
        <>
            {coords && coords.lat && <div className={classes.map}>
                <GoogleMapReact
                    bootstrapURLKeys={{ key: process.env.REACT_APP_GEO_CODE_API_KEY }}
                    defaultCenter={{
                        lat: coords.lat,
                        lng: coords.long
                    }}
                    defaultZoom={15}
                    resetBoundsOnResize={true}
                >
                    <MarkerComponent
                        lat={coords.lat}
                        lng={coords.long}
                        location={location}
                        markerIcon={classes.markerIcon}
                    />
                </GoogleMapReact>
            </div>}
            {location && <div>{location}</div>}
        </>
    )
}

export default GoogleMap;