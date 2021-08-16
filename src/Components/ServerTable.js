import {
    Table, makeStyles, TableBody, TableCell,
    TableContainer, Paper, TableRow
} from '@material-ui/core'

const useStyles = makeStyles(() => ({
    table: {
        minWidth: '300px'
    }
}));

function ServerTable({ data }) {
    const classes = useStyles();
    return (
        <>
            {data && <TableContainer component={Paper} className={classes.table}>
                <Table aria-label="server details table">
                    <TableBody>
                        <TableRow>
                            <TableCell>Machine</TableCell>
                            <TableCell>{data.machine}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>City</TableCell>
                            <TableCell>{data.city}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Country</TableCell>
                            <TableCell>{data.country}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>}
        </>
    )
}

export default ServerTable;