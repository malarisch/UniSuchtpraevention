import React, { useState } from 'react'
import { Box, Button, TextArea, Table, TableHead, TableBody, TableRow, TableCell, H2, Text, Input } from '@adminjs/design-system'
import { ApiClient } from 'adminjs'

const api = new ApiClient()

const GeniusTool = () => {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataOutput, setDataOutput] = useState('');



  const handleClick = async () => {
    setLoading(true)
    const response = await api.getPage({
      method: 'post',
      pageName: 'GeniusTool',
      data: { type: "search", searchString: input }
    })
    var mapped = response.data.message.map((row) => {
      return (
        <TableRow>
          <TableCell>
            {row.result.primary_artist_names}
          </TableCell>
          <TableCell>
            {row.result.title}
          </TableCell>
          <TableCell>
            {row.result.lyrics_state}
          </TableCell>
          <TableCell>
            {row.result.release_date_with_abbreviated_month_for_display}
          </TableCell>
          <TableCell>
            <Button mt="lg" onClick={(e) => handleAdd(row.result.id)}>Hinzufügen</Button> <br/>
            <Button mt="lg" onClick={(e) => startChain(row.result.id)}>Start Job Chain</Button>
          </TableCell>
        </TableRow>
      )
    })
    setOutput(mapped)
    setLoading(false)
  }
  const handleAdd = async (id) => {
    const response = await api.getPage({
      method: "post",
      pageName: 'GeniusTool',
      data: {
        type: "findOrCreate",
        songId: id
      }
    })
    setDataOutput(response.data.message);

  }
  const startChain = async (id) => {
    const response = await api.getPage({
      method: "post",
      pageName: 'GeniusTool',
      data: {
        type: "startChain",
        songId: id
      }
    })
  }

  return (
    <Box variant="grey">
      <H2>SongSuche</H2>
      <Text mb="lg">Genius Search API</Text>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="SongTitel"
        rows={6}
      />
      <Button mt="lg" onClick={handleClick} disabled={loading}>
        {loading ? 'Lädt...' : 'Absenden'}
      </Button>
      {dataOutput && (
        <Box mt="xl" variant="white">
          <H2>API Response</H2>
          <TextArea>
            {JSON.stringify(dataOutput)}
          </TextArea>
        </Box>
      )}
      {output && (
        <Box mt="xl" p="lg" variant="white">
          <H2>Antwort</H2>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  Artist
                </TableCell>
                <TableCell>
                  Song
                </TableCell>
                <TableCell>
                  Lyrics State
                </TableCell>
                <TableCell>
                  Release Date
                </TableCell>
                <TableCell>
                  Actions
                  </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {output}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  )
}

export default GeniusTool