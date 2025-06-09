import React, { useState } from 'react'
import { Box, Button, TextArea, Table, TableHead, TableBody, TableRow, TableCell, H2, Text, Input } from '@adminjs/design-system'
import { ApiClient } from 'adminjs'

const api = new ApiClient()

const GeniusTool = () => {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)



  const handleClick = async () => {
    setLoading(true)
    const response = await api.getPage({
      method: 'post',
      pageName: 'GeniusTool',
      data: { input }
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
            <Button onClick={handleAdd(row.result.id)}/>
          </TableCell>
        </TableRow>
      )
    })
    setOutput(mapped)
    setLoading(false)
  }
  const handleAdd = async (id) => {

  }

  return (
    <Box variant="grey">
      <H2>SongSuche</H2>
      <Text mb="lg">GeniusAPI</Text>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="SongTitel"
        rows={6}
      />
      <Button mt="lg" onClick={handleClick} disabled={loading}>
        {loading ? 'Lädt...' : 'Absenden'}
      </Button>
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