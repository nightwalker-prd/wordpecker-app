import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Flex,
  Icon,
  Alert,
  AlertIcon,
  Progress
} from '@chakra-ui/react';
import { FaDatabase, FaPlus, FaEdit, FaDownload, FaUpload, FaCogs, FaChart } from 'react-icons/fa';
import { WordDefinitionManager } from '../components/admin/WordDefinitionManager';
import { SentenceExampleManager } from '../components/admin/SentenceExampleManager';
import { ExerciseTemplateManager } from '../components/admin/ExerciseTemplateManager';
import { DataImportExport } from '../components/admin/DataImportExport';
import { SystemConfiguration } from '../components/admin/SystemConfiguration';
import { DataStatistics } from '../components/admin/DataStatistics';

export const AdminPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      setIsLoading(true);
      // This would call a backend endpoint to check data health
      const response = await fetch('/api/admin/health');
      const health = await response.json();
      setSystemHealth(health);
    } catch (error) {
      toast({
        title: 'System Check Failed',
        description: 'Unable to check system health',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataReload = async () => {
    try {
      const response = await fetch('/api/admin/reload-data', { method: 'POST' });
      if (response.ok) {
        toast({
          title: 'Data Reloaded',
          description: 'All manual data has been reloaded successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        checkSystemHealth();
      } else {
        throw new Error('Failed to reload data');
      }
    } catch (error) {
      toast({
        title: 'Reload Failed',
        description: 'Failed to reload data. Check server logs.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={4}>
          <Text fontSize="2xl" fontWeight="bold">Loading Admin Panel...</Text>
          <Progress size="lg" isIndeterminate colorScheme="blue" w="300px" />
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Box>
            <Text fontSize="3xl" fontWeight="bold" color="purple.400">
              WordPecker Admin Panel
            </Text>
            <Text color="gray.400" fontSize="lg">
              Manual Data Mode - Configure your vocabulary database
            </Text>
          </Box>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={FaDatabase} />}
              colorScheme="blue"
              variant="outline"
              onClick={handleDataReload}
            >
              Reload Data
            </Button>
            <Badge colorScheme={systemHealth?.status === 'healthy' ? 'green' : 'red'} fontSize="md" p={2}>
              {systemHealth?.status === 'healthy' ? 'System Healthy' : 'Issues Detected'}
            </Badge>
          </HStack>
        </Flex>

        {/* System Health Alert */}
        {systemHealth?.status !== 'healthy' && (
          <Alert status="warning">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">System Issues Detected</Text>
              <Text>{systemHealth?.message || 'Check the system configuration tab for details'}</Text>
            </Box>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab>
              <Icon as={FaEdit} mr={2} />
              Word Definitions
            </Tab>
            <Tab>
              <Icon as={FaPlus} mr={2} />
              Sentence Examples
            </Tab>
            <Tab>
              <Icon as={FaCogs} mr={2} />
              Exercise Templates
            </Tab>
            <Tab>
              <Icon as={FaChart} mr={2} />
              Statistics
            </Tab>
            <Tab>
              <Icon as={FaUpload} mr={2} />
              Import/Export
            </Tab>
            <Tab>
              <Icon as={FaDatabase} mr={2} />
              System Config
            </Tab>
          </TabList>

          <TabPanels>
            {/* Word Definitions Tab */}
            <TabPanel>
              <Card>
                <CardHeader>
                  <Text fontSize="xl" fontWeight="semibold">Word Definition Management</Text>
                  <Text color="gray.500" fontSize="sm">
                    Add, edit, and manage word definitions across different contexts
                  </Text>
                </CardHeader>
                <CardBody>
                  <WordDefinitionManager />
                </CardBody>
              </Card>
            </TabPanel>

            {/* Sentence Examples Tab */}
            <TabPanel>
              <Card>
                <CardHeader>
                  <Text fontSize="xl" fontWeight="semibold">Sentence Example Management</Text>
                  <Text color="gray.500" fontSize="sm">
                    Create and manage example sentences for vocabulary words
                  </Text>
                </CardHeader>
                <CardBody>
                  <SentenceExampleManager />
                </CardBody>
              </Card>
            </TabPanel>

            {/* Exercise Templates Tab */}
            <TabPanel>
              <Card>
                <CardHeader>
                  <Text fontSize="xl" fontWeight="semibold">Exercise Template Configuration</Text>
                  <Text color="gray.500" fontSize="sm">
                    Configure exercise generation rules and templates
                  </Text>
                </CardHeader>
                <CardBody>
                  <ExerciseTemplateManager />
                </CardBody>
              </Card>
            </TabPanel>

            {/* Statistics Tab */}
            <TabPanel>
              <Card>
                <CardHeader>
                  <Text fontSize="xl" fontWeight="semibold">Data Statistics & Analytics</Text>
                  <Text color="gray.500" fontSize="sm">
                    View comprehensive statistics about your vocabulary database
                  </Text>
                </CardHeader>
                <CardBody>
                  <DataStatistics />
                </CardBody>
              </Card>
            </TabPanel>

            {/* Import/Export Tab */}
            <TabPanel>
              <Card>
                <CardHeader>
                  <Text fontSize="xl" fontWeight="semibold">Data Import & Export</Text>
                  <Text color="gray.500" fontSize="sm">
                    Import vocabulary from external sources or export your data
                  </Text>
                </CardHeader>
                <CardBody>
                  <DataImportExport />
                </CardBody>
              </Card>
            </TabPanel>

            {/* System Configuration Tab */}
            <TabPanel>
              <Card>
                <CardHeader>
                  <Text fontSize="xl" fontWeight="semibold">System Configuration</Text>
                  <Text color="gray.500" fontSize="sm">
                    Configure system settings and data validation rules
                  </Text>
                </CardHeader>
                <CardBody>
                  <SystemConfiguration systemHealth={systemHealth} onHealthChange={checkSystemHealth} />
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
};

export default AdminPanel;