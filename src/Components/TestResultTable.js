import {
    Table, makeStyles, TableBody, TableCell,
    TableContainer, Paper, TableRow, Icon
} from '@material-ui/core'

const useStyles = makeStyles(() => ({
    table: {
        minWidth: '300px'
    }
}));

function TestResultTable({downloadSpeed, uploadSpeed}) {
    const classes = useStyles();
    return (
        <>
           {downloadSpeed && <TableContainer component={Paper} className={classes.table}>
                <Table aria-label="speed test results table">
                    <TableBody>
                        <TableRow>
                            <TableCell><Icon>download</Icon></TableCell>
                            <TableCell>Download</TableCell>
                            <TableCell>{downloadSpeed}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell><Icon>upload</Icon></TableCell>
                            <TableCell>Upload</TableCell>
                            <TableCell>{uploadSpeed}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>}
        </>
    )
}

export default TestResultTable;