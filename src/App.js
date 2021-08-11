import './App.css';
import React, { useState } from 'react';
import ReactSpeedometer from "react-d3-speedometer"
import {
  Table, TableBody, TableCell, Icon, Container, makeStyles,
  TableContainer, Box, TableRow, Paper, Button, LinearProgress
} from '@material-ui/core';
import _ from 'lodash';
import { test } from './utils/ndt7';
import { usePosition } from './utils/usePosition';

const useStyles = makeStyles((theme) => ({
  table: {
    minWidth: 500,
  },
  speedometer: {
    display: 'flex',
    justifyContent: 'center',
    width: '300px',
    height: '200px'
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column'
  },
  loader: {
    width: '100%',
    '& > * + *': {
      marginTop: theme.spacing(2),
    },
  },
  speedometerContainer: {
    display: 'flex'
  }
}));

function App() {
  const classes = useStyles();
  const [serverData, setServerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const { latitude, longitude, error } = usePosition();

  const fetchData = async () => {
    setIsLoading(true);
    test(
      {
        userAcceptedDataPolicy: true,
      },
      {
        serverChosen: server => setServerData(`${_.get(server, 'location.city')}, ${_.get(server, 'location.country')}`),
        downloadMeasurement: data => {
          setDownloadSpeed(_.has(data, 'Data') ? _.round(data.Data, 2) : null)
        },
        uploadMeasurement: data => setUploadSpeed(_.has(data, 'Data') ? _.round(data.Data, 2) : null),
        downloadComplete: data => {
          // console.log(data)
        },
        uploadComplete: data => {
          // console.log(data)
        }
      },
    )
      .then((exitcode) => {
        console.log(`Exitcode - ${exitcode}`)
        setIsLoading(false)
        // process.exit(exitcode);
      });
  }

  return (
    <Container maxWidth="sm" className={classes.container}>
      <div className={classes.speedometerContainer}>
        <div className={classes.speedometer}>
          <ReactSpeedometer value={downloadSpeed}
            currentValueText={`Download speed: ${downloadSpeed} Mbps`}
            maxValue={500}
            className={classes.speedometer}
            fluidWidth={true}
          />
        </div>
        <div className={classes.speedometer}>
          <ReactSpeedometer value={uploadSpeed}
            currentValueText={`Upload speed: ${uploadSpeed} Mbps`}
            maxValue={50}
            className={classes.speedometer}
            fluidWidth={true}
          />
        </div>
      </div>
      <Box component="div" p={1} m={1} bgcolor="background.paper"
        visibility={`${isLoading ? 'visible' : 'hidden'}`} className={classes.loader}>
        <LinearProgress />
      </Box>

      <Button variant="contained" color="primary" onClick={fetchData} disabled={isLoading}>
        <span>Speed Test</span>
      </Button>
      {downloadSpeed !== 0 && <TableContainer component={Paper}>
        <Table className={classes.table} aria-label="simple table">
          <TableBody>
            <TableRow>
              <TableCell>
                <Icon>dns</Icon>
              </TableCell>
              <TableCell>Test Server</TableCell>
              <TableCell>{serverData}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Icon>download</Icon>
              </TableCell>
              <TableCell>Download</TableCell>
              <TableCell>{`${downloadSpeed} Mbps`}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Icon>upload</Icon>
              </TableCell>
              <TableCell>Upload</TableCell>
              <TableCell>{`${uploadSpeed} Mbps`}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                {!error && <Icon>my_location</Icon>}
                {error && <Icon>location_off</Icon>}
              </TableCell>
              <TableCell>Coordinates</TableCell>
              {!error &&
                <TableCell>{`Lat: ${latitude}, Long: ${longitude}`}</TableCell>
              }
              {error && <TableCell>{`Error: ${error}`}</TableCell>}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>}
    </Container>
  );
}

export default App;
