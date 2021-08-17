import React, { useState } from 'react';
import {
    Icon, Container, makeStyles, Box,  Button, CircularProgress
} from '@material-ui/core';
import _ from 'lodash';
import { test, discoverServerURLs } from '../utils/ndt7';
import { usePosition } from '../utils/usePosition';
import Steps, { Step } from 'rc-steps';
import 'rc-steps/assets/index.css';
import GoogleMap from './GoogleMap';
import ServerTable from './ServerTable';
import TestResultTable from './TestResultTable';

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
    },
    step:{
        flex: '1 !important' 
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

    const [testStep, setTestStep] = useState({
        text: 'Speed Test',
        icon: 'speed'
    });

    const [downloadSpeed, setDownloadSpeed] = useState(null)
    const [uploadSpeed, setUploadSpeed] = useState(null)

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
        setLocationStep({ text: 'Location', icon: 'gps_fixed' });
        setStepNumber(1);

        //Step 2: Get server details
        
        setServerStep({ text: 'Searching nearby server', icon: 'loading' });
        discoverServerURLs(
            {
                userAcceptedDataPolicy: true,
            },
            {
                serverChosen: server => {
                    setServerData({
                        city: _.get(server, 'location.city'),
                        country: _.get(server, 'location.country'),
                        machine: _.get(server, 'machine')
                    });
                    setServerStep({ text: 'Server Details', icon: 'dns' });
                    setStepNumber(2);
                }
            }
        );

        //Step 3: Perform Speed Test
        setTimeout(() => {
            setTestStep({ text: 'Download Test', icon: 'loading'});
            test({
                userAcceptedDataPolicy: true,
            },
            {
                downloadMeasurement: data => {
                    setDownloadSpeed(_.has(data, 'Data') ? _.round(data.Data, 2) : null)
                },
                downloadComplete: data => {
                    setTestStep({ text: 'Upload Test', icon: 'loading' });
                },
                uploadMeasurement: data => {
                    setUploadSpeed(_.has(data, 'Data') ? _.round(data.Data, 2) : null)
                },
                uploadComplete: data => {
                    setTestStep({ text: 'Speed Test', icon: 'speed' });
                    setIsFetchingData(false);
                }
            });
        }, 500);
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
                        description={<GoogleMap coords={coords} location={location} />}  className={classes.step}/>
                    <Step title={serverStep.text} icon={serverStep.icon !== 'loading' ? <Icon>{serverStep.icon}</Icon> : <CircularProgress />}
                        description={<ServerTable data={serverData} />} className={classes.step} />
                    <Step title={testStep.text} className={classes.step}
                    icon={testStep.icon !== 'loading' ? <Icon>{testStep.icon}</Icon> : <CircularProgress />} 
                    description={<TestResultTable downloadSpeed={downloadSpeed} uploadSpeed={uploadSpeed}/>}
                    />
                </Steps>
            </Container>
        </div>
    );
}

export default App;
