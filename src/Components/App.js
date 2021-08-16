import React, { useState } from 'react';
import ReactSpeedometer from "react-d3-speedometer"
import {
    Table, TableBody, TableCell, Icon, Container, makeStyles,
    TableContainer, Box, TableRow, Paper, Button, LinearProgress, CircularProgress
} from '@material-ui/core';
import _ from 'lodash';
import { test, discoverServerURLs } from '../utils/ndt7';
import { usePosition } from '../utils/usePosition';
import Steps, { Step } from 'rc-steps';
import 'rc-steps/assets/index.css';
import GoogleMap from './GoogleMap';
import ServerTable from './ServerTable';

const useStyles = makeStyles((theme) => ({
    container: {
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column'
    },
    root: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column'
    }
}));

function App() {
    const classes = useStyles();
    const { getLocation } = usePosition();
    const [stepNumber, setStepNumber] = useState(0);
    const [coords, setCoords] = useState(null);
    const [location, setLocation] = useState(null);
    const [isFetchingData, setIsFetchingData] = useState(false);

    // const [locationStep, setLocationStep] = useState('Location');
    const [locationStep, setLocationStep] = useState({
        text: 'Location',
        icon: 'gps_fixed'
    });

    const [serverStep, setServerStep] = useState({
        text: 'Server',
        icon: 'dns'
    });

    const [serverData, setServerData] = useState(null);

    const fetchData = async () => {
        setIsFetchingData(true);

        //Step 1: Locating the user 
        setLocationStep({ text: 'Locating', icon: 'loading' });
        let { latitude, longitude, error, address } = await getLocation();
        setCoords({ lat: latitude, long: longitude });
        error ?
            setLocation(error) :
            setLocation(`${address ? address : (latitude ? latitude + ',' + longitude : '')}`);
        setLocationStep({ text: 'Locating', icon: 'gps_fixed' });


        //Step 2: Get server details
        setStepNumber(1);
        setServerStep({ text: 'Searching nearby server', icon: 'loading' });
        discoverServerURLs(
            {
                userAcceptedDataPolicy: true,
            },
            {
                serverChosen: server => {
                    setTimeout(() => {
                        setServerData({
                            city: _.get(server, 'location.city'),
                            country: _.get(server, 'location.country'),
                            machine: _.get(server, 'machine')
                        });
                        setServerStep({ text: 'Server Details', icon: 'dns' });
                        setIsFetchingData(false);
                        setStepNumber(2);
                    }, 500)
                }
            }
        );

        //Step 3: Start Internet Speed Test

    }

    return (
        <div className={classes.root}>
            <Container maxWidth="lg" className={classes.container}>
                <Box mb={2}>
                    <Button variant="contained" color="primary" onClick={fetchData} disabled={isFetchingData}>
                        <span>Initiate Speed Test</span>
                    </Button>
                </Box>
                <Steps current={stepNumber}>
                    <Step title={locationStep.text} icon={locationStep.icon !== 'loading' ? <Icon>{locationStep.icon}</Icon> : <CircularProgress />}
                        description={<GoogleMap coords={coords} location={location} />} />
                    <Step title={serverStep.text} icon={serverStep.icon !== 'loading' ? <Icon>{serverStep.icon}</Icon> : <CircularProgress />}
                        description={<ServerTable data={serverData} />} />
                    <Step title="third" />
                    <Step title="forth" />
                </Steps>
            </Container>
        </div>
    );
}

export default App;
