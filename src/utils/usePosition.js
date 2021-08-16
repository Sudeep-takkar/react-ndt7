import _ from 'lodash';
export const usePosition = () => {
    const getAddress = async (lat, long) => {
        const GEO_CODE_API = 'https://maps.googleapis.com/maps/api/geocode/json'
        console.log(lat, long, process.env);
        return await fetch(`${GEO_CODE_API}?latlng=${lat},${long}&key=${process.env.REACT_APP_GEO_CODE_API_KEY}`)
            .then(response => response.json())
            .then(data => _.get(data, 'results.0.formatted_address'));
    }

    const getLocation = () => {
        const geo = navigator.geolocation;
        if (!geo) {
            return new Promise(resolve =>
                setTimeout(() => resolve({ error: 'Geolocation is not supported' }), 500))
        }
        return new Promise((resolve, reject) => {
            geo.getCurrentPosition(async response => {
                let address = await getAddress(_.get(response, 'coords.latitude'), _.get(response, 'coords.longitude'));
                resolve({ address: address, latitude: _.get(response, 'coords.latitude'), longitude: _.get(response, 'coords.longitude') });
            }, (err) => {
                setTimeout(() => resolve({ error: err.message }), 500)
            });
        });
    }

    return { getLocation };
}