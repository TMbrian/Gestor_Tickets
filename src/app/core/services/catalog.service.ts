import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Site, Area, Ticket } from '../models/ticket.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {

  constructor(private firestore: Firestore, private auth: AuthService) { }

  private get userId(): string {
    return this.auth.currentUser?.id || '';
  }

  // SITES
  private get sitesCollection() {
    return collection(this.firestore, 'sites');
  }

  async getSites(): Promise<Site[]> {
    if (!this.userId) return [];
    const q = query(this.sitesCollection, where('userId', '==', this.userId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async addSite(name: string): Promise<string> {
    const site: Site = {
      name,
      userId: this.userId,
      createdAt: Date.now()
    };
    const docRef = await addDoc(this.sitesCollection, site);
    return docRef.id;
  }

  async updateSite(id: string, name: string): Promise<void> {
    const docRef = doc(this.firestore, `sites/${id}`);
    return updateDoc(docRef, { name });
  }

  async deleteSite(id: string): Promise<void> {
    const docRef = doc(this.firestore, `sites/${id}`);
    return deleteDoc(docRef);
  }

  // AREAS
  private get areasCollection() {
    return collection(this.firestore, 'areas');
  }

  async getAreas(): Promise<Area[]> {
    if (!this.userId) return [];
    const q = query(this.areasCollection, where('userId', '==', this.userId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async addArea(name: string): Promise<string> {
    const area: Area = {
      name,
      userId: this.userId,
      createdAt: Date.now()
    };
    const docRef = await addDoc(this.areasCollection, area);
    return docRef.id;
  }

  async updateArea(id: string, name: string): Promise<void> {
    const docRef = doc(this.firestore, `areas/${id}`);
    return updateDoc(docRef, { name });
  }

  async deleteArea(id: string): Promise<void> {
    const docRef = doc(this.firestore, `areas/${id}`);
    return deleteDoc(docRef);
  }

  // AUTO-POPULATE
  async autoPopulateFromTickets(tickets: Ticket[]): Promise<{ sitesAdded: number, areasAdded: number }> {
    try {
      const currentSites = await this.getSites();
      const currentAreas = await this.getAreas();
      
      const siteNames = new Set(currentSites.map(s => s.name.toLowerCase().trim()));
      const areaNames = new Set(currentAreas.map(a => a.name.toLowerCase().trim()));

      let sitesAdded = 0;
      let areasAdded = 0;

      // Extract unique names first to avoid redundant Firestore calls
      const uniqueSites = new Set<string>();
      const uniqueAreas = new Set<string>();

      tickets.forEach(t => {
        // Soporte para posibles nombres de campos antiguos si existieran
        const s = (t.site || (t as any)['Sitio/CEDI'])?.trim();
        const a = (t.affectedArea || (t as any)['Área Afectada'])?.trim();
        if (s) uniqueSites.add(s);
        if (a) uniqueAreas.add(a);
      });

      for (const sName of uniqueSites) {
        if (!siteNames.has(sName.toLowerCase())) {
          await this.addSite(sName);
          siteNames.add(sName.toLowerCase());
          sitesAdded++;
        }
      }

      for (const aName of uniqueAreas) {
        if (!areaNames.has(aName.toLowerCase())) {
          await this.addArea(aName);
          areaNames.add(aName.toLowerCase());
          areasAdded++;
        }
      }

      console.log(`Auto-población finalizada: ${sitesAdded} sitios, ${areasAdded} áreas.`);
      return { sitesAdded, areasAdded };
    } catch (err) {
      console.error('Error in autoPopulateFromTickets:', err);
      return { sitesAdded: 0, areasAdded: 0 };
    }
  }
}
