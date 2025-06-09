const whois = require('whois');

export interface DomainInfo {
  domain: string;
  registrationDate: Date | null;
  expirationDate: Date | null;
  lastRenewDate: Date | null;
  registrar: string | null;
  status: string | null;
  nameServers: string[];
}

export class WhoisService {
  static async lookupDomain(domain: string): Promise<DomainInfo> {
    return new Promise((resolve, reject) => {
      whois.lookup(domain, (err: Error | null, data: string) => {
        if (err) {
          reject(err);
          return;
        }

        const info: DomainInfo = {
          domain,
          registrationDate: this.extractDate(data, ['Creation Date', 'Created On', 'Registered']),
          expirationDate: this.extractDate(data, ['Expiration Date', 'Expires On', 'Expiry Date']),
          lastRenewDate: this.extractDate(data, ['Updated Date', 'Last Updated', 'Modified']),
          registrar: this.extractField(data, ['Registrar:', 'Registrar']),
          status: this.extractField(data, ['Status:', 'Domain Status']),
          nameServers: this.extractNameServers(data)
        };

        resolve(info);
      });
    });
  }

  private static extractDate(data: string, patterns: string[]): Date | null {
    for (const pattern of patterns) {
      const regex = new RegExp(`${pattern}:?\\s*(.+)`, 'i');
      const match = data.match(regex);
      if (match) {
        const dateStr = match[1].trim().split('\n')[0];
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      }
    }
    return null;
  }

  private static extractField(data: string, patterns: string[]): string | null {
    for (const pattern of patterns) {
      const regex = new RegExp(`${pattern}\\s*(.+)`, 'i');
      const match = data.match(regex);
      if (match) {
        return match[1].trim().split('\n')[0];
      }
    }
    return null;
  }

  private static extractNameServers(data: string): string[] {
    const nsRegex = /Name Server:?\s*(.+)/gi;
    const nameServers: string[] = [];
    let match;
    while ((match = nsRegex.exec(data)) !== null) {
      nameServers.push(match[1].trim());
    }
    return nameServers;
  }
}
