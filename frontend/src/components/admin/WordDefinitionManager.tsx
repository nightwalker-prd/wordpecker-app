import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  Textarea,
  Button,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  FormControl,
  FormLabel,
  Card,
  CardBody,
  Text,
  Badge,
  Flex,
  Spacer
} from '@chakra-ui/react';
import { FaEdit, FaTrash, FaPlus, FaSearch } from 'react-icons/fa';

interface WordDefinition {
  word: string;
  general: string;
  contextual: Record<string, string>;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  part_of_speech: string;
}

export const WordDefinitionManager: React.FC = () => {
  const [definitions, setDefinitions] = useState<WordDefinition[]>([]);
  const [filteredDefinitions, setFilteredDefinitions] = useState<WordDefinition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContext, setSelectedContext] = useState('all');
  const [editingDefinition, setEditingDefinition] = useState<WordDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Form state for new/edit definition
  const [formData, setFormData] = useState({
    word: '',
    general: '',
    contextual: {} as Record<string, string>,
    difficulty: 'intermediate' as const,
    part_of_speech: 'noun'
  });

  const contexts = ['business', 'daily', 'technology', 'academic', 'sports', 'travel', 'medical', 'legal'];

  useEffect(() => {
    loadDefinitions();
  }, []);

  useEffect(() => {
    filterDefinitions();
  }, [definitions, searchTerm, selectedContext]);

  const loadDefinitions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/definitions');
      const data = await response.json();
      setDefinitions(data.definitions || []);
    } catch (error) {
      toast({
        title: 'Load Failed',
        description: 'Failed to load word definitions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterDefinitions = () => {
    let filtered = definitions;

    if (searchTerm) {
      filtered = filtered.filter(def => 
        def.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        def.general.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedContext !== 'all') {
      filtered = filtered.filter(def => 
        def.contextual && def.contextual[selectedContext]
      );
    }

    setFilteredDefinitions(filtered);
  };

  const handleSaveDefinition = async () => {
    try {
      const method = editingDefinition ? 'PUT' : 'POST';
      const url = editingDefinition 
        ? `/api/admin/definitions/${editingDefinition.word}`
        : '/api/admin/definitions';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: editingDefinition ? 'Definition Updated' : 'Definition Added',
          description: `Word "${formData.word}" has been saved successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        loadDefinitions();
        handleCloseModal();
      } else {
        throw new Error('Failed to save definition');
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save word definition',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteDefinition = async (word: string) => {
    if (!confirm(`Are you sure you want to delete the definition for "${word}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/definitions/${word}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Definition Deleted',
          description: `Definition for "${word}" has been removed`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        loadDefinitions();
      } else {
        throw new Error('Failed to delete definition');
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete word definition',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEditDefinition = (definition: WordDefinition) => {
    setEditingDefinition(definition);
    setFormData({
      word: definition.word,
      general: definition.general,
      contextual: { ...definition.contextual },
      difficulty: definition.difficulty,
      part_of_speech: definition.part_of_speech
    });
    onOpen();
  };

  const handleAddNew = () => {
    setEditingDefinition(null);
    setFormData({
      word: '',
      general: '',
      contextual: {},
      difficulty: 'intermediate',
      part_of_speech: 'noun'
    });
    onOpen();
  };

  const handleCloseModal = () => {
    setEditingDefinition(null);
    setFormData({
      word: '',
      general: '',
      contextual: {},
      difficulty: 'intermediate',
      part_of_speech: 'noun'
    });
    onClose();
  };

  const handleContextualDefinitionChange = (context: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contextual: {
        ...prev.contextual,
        [context]: value
      }
    }));
  };

  return (
    <Box>
      {/* Controls */}
      <VStack spacing={4} align="stretch" mb={6}>
        <HStack spacing={4}>
          <Box flex={1}>
            <Input
              placeholder="Search words or definitions..."
              leftIcon={<FaSearch />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>
          <Select value={selectedContext} onChange={(e) => setSelectedContext(e.target.value)} w="200px">
            <option value="all">All Contexts</option>
            {contexts.map(context => (
              <option key={context} value={context}>{context}</option>
            ))}
          </Select>
          <Button leftIcon={<FaPlus />} colorScheme="green" onClick={handleAddNew}>
            Add Word
          </Button>
        </HStack>
      </VStack>

      {/* Definitions Table */}
      <Card>
        <CardBody>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Word</Th>
                <Th>General Definition</Th>
                <Th>Contexts</Th>
                <Th>Difficulty</Th>
                <Th>Part of Speech</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredDefinitions.map((definition) => (
                <Tr key={definition.word}>
                  <Td>
                    <Text fontWeight="semibold" color="blue.400">
                      {definition.word}
                    </Text>
                  </Td>
                  <Td maxW="300px">
                    <Text isTruncated>{definition.general}</Text>
                  </Td>
                  <Td>
                    <Flex gap={1} flexWrap="wrap">
                      {Object.keys(definition.contextual || {}).map(context => (
                        <Badge key={context} colorScheme="purple" size="sm">
                          {context}
                        </Badge>
                      ))}
                    </Flex>
                  </Td>
                  <Td>
                    <Badge 
                      colorScheme={
                        definition.difficulty === 'basic' ? 'green' :
                        definition.difficulty === 'intermediate' ? 'yellow' : 'red'
                      }
                    >
                      {definition.difficulty}
                    </Badge>
                  </Td>
                  <Td>{definition.part_of_speech}</Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="Edit definition"
                        icon={<FaEdit />}
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        onClick={() => handleEditDefinition(definition)}
                      />
                      <IconButton
                        aria-label="Delete definition"
                        icon={<FaTrash />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleDeleteDefinition(definition.word)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {filteredDefinitions.length === 0 && (
            <Box textAlign="center" py={8}>
              <Text color="gray.500">No definitions found matching your criteria</Text>
            </Box>
          )}
        </CardBody>
      </Card>

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingDefinition ? 'Edit Definition' : 'Add New Definition'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Word</FormLabel>
                <Input
                  value={formData.word}
                  onChange={(e) => setFormData(prev => ({ ...prev, word: e.target.value }))}
                  placeholder="Enter the word"
                  isReadOnly={!!editingDefinition}
                />
              </FormControl>

              <FormControl>
                <FormLabel>General Definition</FormLabel>
                <Textarea
                  value={formData.general}
                  onChange={(e) => setFormData(prev => ({ ...prev, general: e.target.value }))}
                  placeholder="Enter the general definition"
                  rows={3}
                />
              </FormControl>

              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Difficulty</FormLabel>
                  <Select
                    value={formData.difficulty}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      difficulty: e.target.value as 'basic' | 'intermediate' | 'advanced'
                    }))}
                  >
                    <option value="basic">Basic</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Part of Speech</FormLabel>
                  <Select
                    value={formData.part_of_speech}
                    onChange={(e) => setFormData(prev => ({ ...prev, part_of_speech: e.target.value }))}
                  >
                    <option value="noun">Noun</option>
                    <option value="verb">Verb</option>
                    <option value="adjective">Adjective</option>
                    <option value="adverb">Adverb</option>
                    <option value="preposition">Preposition</option>
                    <option value="conjunction">Conjunction</option>
                  </Select>
                </FormControl>
              </HStack>

              <Box w="full">
                <Text fontSize="md" fontWeight="semibold" mb={3}>Contextual Definitions</Text>
                <VStack spacing={3}>
                  {contexts.map(context => (
                    <FormControl key={context}>
                      <FormLabel fontSize="sm" textTransform="capitalize">{context}</FormLabel>
                      <Textarea
                        value={formData.contextual[context] || ''}
                        onChange={(e) => handleContextualDefinitionChange(context, e.target.value)}
                        placeholder={`Definition in ${context} context`}
                        size="sm"
                        rows={2}
                      />
                    </FormControl>
                  ))}
                </VStack>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSaveDefinition}
              isDisabled={!formData.word || !formData.general}
            >
              {editingDefinition ? 'Update' : 'Add'} Definition
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};