import { db } from "./db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { 
  users, 
  projects, 
  messages, 
  hosts, 
  sandwichCollections, 
  drivers, 
  recipients, 
  conversations, 
  conversationParticipants,
  meetings,
  contacts,
  suggestions,
  suggestionResponses,
  projectTasks,
  projectComments,
  taskCompletions,
  projectAssignments,
  messageRecipients,
  messageThreads,
  kudosTracking,
  weeklyReports,
  meetingMinutes,
  driveLinks,
  agendaItems,
  driverAgreements,
  hostContacts,
  projectDocuments,
  hostedFiles,
  notifications,
  committees,
  committeeMemberships,
  announcements,
  googleSheets,
  workLogs,
  deletionAudit
} from "../shared/schema";
import { IStorage } from "./storage";
import { AuditLogger } from "./audit-logger";

export class DatabaseStorage implements IStorage {
  private currentUserId: string | null = null;
  
  // Set current user for audit logging
  setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }
  
  // Helper method to perform soft delete
  private async softDelete(table: any, id: string | number, reason?: string) {
    const deletedAt = new Date();
    const deletedBy = this.currentUserId;
    
    // Get the record before deletion for audit
    const [existingRecord] = await db.select().from(table).where(eq(table.id, id)).limit(1);
    
    if (!existingRecord) {
      return false;
    }
    
    // Perform soft delete
    const result = await db
      .update(table)
      .set({ 
        deletedAt, 
        deletedBy 
      })
      .where(eq(table.id, id));
    
    // Log to deletion audit
    if (result.rowCount && result.rowCount > 0) {
      await db.insert(deletionAudit).values({
        tableName: table[Symbol.for('drizzle:Name')] || 'unknown',
        recordId: id.toString(),
        deletedAt,
        deletedBy: deletedBy || 'system',
        deletionReason: reason || 'Soft delete via application',
        recordData: existingRecord,
        canRestore: true
      });
    }
    
    return (result.rowCount ?? 0) > 0;
  }
  
  // Helper method to get non-deleted records
  private getNonDeletedQuery(table: any) {
    return db.select().from(table).where(isNull(table.deletedAt));
  }

  // USER METHODS
  async getUsers() {
    return this.getNonDeletedQuery(users);
  }

  async getUserById(id: string) {
    const result = await db.select().from(users).where(and(eq(users.id, id), isNull(users.deletedAt))).limit(1);
    return result[0] || null;
  }

  async createUser(userData: any) {
    const [newUser] = await db.insert(users).values(userData).returning();
    return newUser;
  }

  async updateUser(id: string, userData: any) {
    const [updatedUser] = await db.update(users).set({
      ...userData,
      updatedAt: new Date()
    }).where(and(eq(users.id, id), isNull(users.deletedAt))).returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.softDelete(users, id, 'User account deleted');
  }

  // PROJECT METHODS
  async getProjects() {
    return this.getNonDeletedQuery(projects).orderBy(desc(projects.createdAt));
  }

  async getProjectById(id: number) {
    const result = await db.select().from(projects).where(and(eq(projects.id, id), isNull(projects.deletedAt))).limit(1);
    return result[0] || null;
  }

  async createProject(projectData: any) {
    const [newProject] = await db.insert(projects).values(projectData).returning();
    return newProject;
  }

  async updateProject(id: number, projectData: any) {
    const [updatedProject] = await db.update(projects).set({
      ...projectData,
      updatedAt: new Date()
    }).where(and(eq(projects.id, id), isNull(projects.deletedAt))).returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.softDelete(projects, id, 'Project deleted');
  }

  // PROJECT TASK METHODS
  async getProjectTasks(projectId: number) {
    return db.select().from(projectTasks)
      .where(and(eq(projectTasks.projectId, projectId), isNull(projectTasks.deletedAt)))
      .orderBy(projectTasks.order);
  }

  async createProjectTask(taskData: any) {
    const [newTask] = await db.insert(projectTasks).values(taskData).returning();
    return newTask;
  }

  async updateProjectTask(id: number, taskData: any) {
    const [updatedTask] = await db.update(projectTasks).set({
      ...taskData,
      updatedAt: new Date()
    }).where(and(eq(projectTasks.id, id), isNull(projectTasks.deletedAt))).returning();
    return updatedTask;
  }

  async deleteProjectTask(id: number): Promise<boolean> {
    return this.softDelete(projectTasks, id, 'Task deleted');
  }

  // MESSAGE METHODS
  async getMessages(conversationId: number) {
    return db.select().from(messages)
      .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt)))
      .orderBy(messages.createdAt);
  }

  async createMessage(messageData: any) {
    const [newMessage] = await db.insert(messages).values(messageData).returning();
    return newMessage;
  }

  async updateMessage(id: number, messageData: any) {
    const [updatedMessage] = await db.update(messages).set({
      ...messageData,
      updatedAt: new Date()
    }).where(and(eq(messages.id, id), isNull(messages.deletedAt))).returning();
    return updatedMessage;
  }

  async deleteMessage(id: number): Promise<boolean> {
    console.log(`[DEBUG] deleteMessage called with id: ${id}`);
    try {
      const success = await this.softDelete(messages, id, 'Message deleted by user');
      console.log(`[DEBUG] deleteMessage success: ${success}`);
      return success;
    } catch (error) {
      console.error(`[ERROR] deleteMessage failed for id ${id}:`, error);
      return false;
    }
  }

  // SANDWICH COLLECTION METHODS
  async getSandwichCollections(limit: number, offset: number) {
    return db.select().from(sandwichCollections)
      .where(isNull(sandwichCollections.deletedAt))
      .orderBy(desc(sandwichCollections.submittedAt))
      .limit(limit)
      .offset(offset);
  }

  async getAllSandwichCollections() {
    return db.select().from(sandwichCollections)
      .where(isNull(sandwichCollections.deletedAt))
      .orderBy(desc(sandwichCollections.submittedAt));
  }

  async createSandwichCollection(collectionData: any) {
    const [newCollection] = await db.insert(sandwichCollections).values(collectionData).returning();
    return newCollection;
  }

  async updateSandwichCollection(id: number, collectionData: any) {
    const [updatedCollection] = await db.update(sandwichCollections).set(collectionData)
      .where(and(eq(sandwichCollections.id, id), isNull(sandwichCollections.deletedAt))).returning();
    return updatedCollection;
  }

  async deleteSandwichCollection(id: number): Promise<boolean> {
    return this.softDelete(sandwichCollections, id, 'Collection deleted');
  }

  // HOST METHODS
  async getHosts() {
    return this.getNonDeletedQuery(hosts).orderBy(hosts.name);
  }

  async getHostById(id: number) {
    const result = await db.select().from(hosts).where(and(eq(hosts.id, id), isNull(hosts.deletedAt))).limit(1);
    return result[0] || null;
  }

  async createHost(hostData: any) {
    const [newHost] = await db.insert(hosts).values(hostData).returning();
    return newHost;
  }

  async updateHost(id: number, hostData: any) {
    const [updatedHost] = await db.update(hosts).set({
      ...hostData,
      updatedAt: new Date()
    }).where(and(eq(hosts.id, id), isNull(hosts.deletedAt))).returning();
    return updatedHost;
  }

  async deleteHost(id: number): Promise<boolean> {
    // Check if this host has any associated sandwich collections
    const host = await this.getHostById(id);
    if (!host) {
      return false; // Host doesn't exist
    }

    const [collectionCount] = await db
      .select({ count: sql`count(*)` })
      .from(sandwichCollections)
      .where(and(eq(sandwichCollections.hostName, host.name), isNull(sandwichCollections.deletedAt)));

    if (Number(collectionCount.count) > 0) {
      throw new Error(`Cannot delete host "${host.name}" because it has ${collectionCount.count} associated collection records. Please update or remove these records first.`);
    }

    // Also soft delete any host contacts first
    await db.update(hostContacts).set({ 
      deletedAt: new Date(), 
      deletedBy: this.currentUserId 
    }).where(and(eq(hostContacts.hostId, id), isNull(hostContacts.deletedAt)));

    // Now soft delete the host
    return this.softDelete(hosts, id, 'Host deleted');
  }

  // DRIVER METHODS
  async getDrivers() {
    return this.getNonDeletedQuery(drivers).orderBy(drivers.name);
  }

  async createDriver(driverData: any) {
    const [newDriver] = await db.insert(drivers).values(driverData).returning();
    return newDriver;
  }

  async updateDriver(id: number, driverData: any) {
    const [updatedDriver] = await db.update(drivers).set(driverData)
      .where(and(eq(drivers.id, id), isNull(drivers.deletedAt))).returning();
    return updatedDriver;
  }

  async deleteDriver(id: number): Promise<boolean> {
    return this.softDelete(drivers, id, 'Driver deleted');
  }

  // RECIPIENT METHODS
  async getRecipients() {
    return this.getNonDeletedQuery(recipients).orderBy(recipients.name);
  }

  async createRecipient(recipientData: any) {
    const [newRecipient] = await db.insert(recipients).values(recipientData).returning();
    return newRecipient;
  }

  async updateRecipient(id: number, recipientData: any) {
    const [updatedRecipient] = await db.update(recipients).set({
      ...recipientData,
      updatedAt: new Date()
    }).where(and(eq(recipients.id, id), isNull(recipients.deletedAt))).returning();
    return updatedRecipient;
  }

  async deleteRecipient(id: number): Promise<boolean> {
    return this.softDelete(recipients, id, 'Recipient deleted');
  }

  // CONTACT METHODS
  async getContacts() {
    return this.getNonDeletedQuery(contacts).orderBy(contacts.name);
  }

  async createContact(contactData: any) {
    const [newContact] = await db.insert(contacts).values(contactData).returning();
    return newContact;
  }

  async updateContact(id: number, contactData: any) {
    const [updatedContact] = await db.update(contacts).set({
      ...contactData,
      updatedAt: new Date()
    }).where(and(eq(contacts.id, id), isNull(contacts.deletedAt))).returning();
    return updatedContact;
  }

  async deleteContact(id: number): Promise<boolean> {
    return this.softDelete(contacts, id, 'Contact deleted');
  }

  // MEETING METHODS
  async getMeetings() {
    return this.getNonDeletedQuery(meetings).orderBy(desc(meetings.createdAt));
  }

  async createMeeting(meetingData: any) {
    const [newMeeting] = await db.insert(meetings).values(meetingData).returning();
    return newMeeting;
  }

  async updateMeeting(id: number, meetingData: any) {
    const [updatedMeeting] = await db.update(meetings).set(meetingData)
      .where(and(eq(meetings.id, id), isNull(meetings.deletedAt))).returning();
    return updatedMeeting;
  }

  async deleteMeeting(id: number): Promise<boolean> {
    return this.softDelete(meetings, id, 'Meeting deleted');
  }

  // SUGGESTION METHODS
  async getSuggestions() {
    return this.getNonDeletedQuery(suggestions).orderBy(desc(suggestions.createdAt));
  }

  async createSuggestion(suggestionData: any) {
    const [newSuggestion] = await db.insert(suggestions).values(suggestionData).returning();
    return newSuggestion;
  }

  async updateSuggestion(id: number, suggestionData: any) {
    const [updatedSuggestion] = await db.update(suggestions).set({
      ...suggestionData,
      updatedAt: new Date()
    }).where(and(eq(suggestions.id, id), isNull(suggestions.deletedAt))).returning();
    return updatedSuggestion;
  }

  async deleteSuggestion(id: number): Promise<boolean> {
    try {
      // First soft delete all responses
      await db.update(suggestionResponses).set({ 
        deletedAt: new Date(), 
        deletedBy: this.currentUserId 
      }).where(and(eq(suggestionResponses.suggestionId, id), isNull(suggestionResponses.deletedAt)));
      
      // Then soft delete the suggestion
      return this.softDelete(suggestions, id, 'Suggestion deleted');
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      return false;
    }
  }

  // AUDIT AND RESTORE METHODS
  async getDeletionHistory(tableName?: string, recordId?: string) {
    let query = db.select().from(deletionAudit);
    
    if (tableName) {
      query = query.where(eq(deletionAudit.tableName, tableName));
    }
    
    if (recordId) {
      query = query.where(eq(deletionAudit.recordId, recordId));
    }
    
    return query.orderBy(desc(deletionAudit.deletedAt));
  }

  async restoreRecord(tableName: string, recordId: string): Promise<boolean> {
    try {
      // This would need to be implemented with dynamic SQL
      // For now, return false to indicate it needs manual intervention
      console.log(`Restore request for ${tableName} record ${recordId} - requires manual intervention`);
      return false;
    } catch (error) {
      console.error('Error restoring record:', error);
      return false;
    }
  }

  // Additional helper methods for common operations
  async getActiveUsers() {
    return db.select().from(users)
      .where(and(eq(users.isActive, true), isNull(users.deletedAt)))
      .orderBy(users.displayName);
  }

  async getActiveProjects() {
    return db.select().from(projects)
      .where(and(eq(projects.status, 'active'), isNull(projects.deletedAt)))
      .orderBy(desc(projects.createdAt));
  }

  async getActiveHosts() {
    return db.select().from(hosts)
      .where(and(eq(hosts.status, 'active'), isNull(hosts.deletedAt)))
      .orderBy(hosts.name);
  }

  async getActiveDrivers() {
    return db.select().from(drivers)
      .where(and(eq(drivers.isActive, true), isNull(drivers.deletedAt)))
      .orderBy(drivers.name);
  }

  async getActiveRecipients() {
    return db.select().from(recipients)
      .where(and(eq(recipients.status, 'active'), isNull(recipients.deletedAt)))
      .orderBy(recipients.name);
  }
}