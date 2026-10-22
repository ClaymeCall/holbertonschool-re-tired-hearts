import { MigrationInterface, QueryRunner } from 'typeorm';

// The service is in French: the closed list of interests (reference data of the initial migration) is
// translated, in place, so every interest keeps its id (profiles and events point to the id).
const NAMES: [string, string][] = [
  ['Walking and hiking', 'Randonnée et marche'],
  ['Gardening', 'Jardinage'],
  ['Cooking', 'Cuisine'],
  ['Reading and book clubs', 'Lecture et clubs de lecture'],
  ['Music and singing', 'Musique et chant'],
  ['Dancing', 'Danse'],
  ['Travel and discovery', 'Voyages et découvertes'],
  ['Cinema and theatre', 'Cinéma et théâtre'],
  ['Board games and cards', 'Jeux de société et de cartes'],
  ['Arts and crafts', 'Arts et loisirs créatifs'],
  ['Photography', 'Photographie'],
  ['Volunteering', 'Bénévolat'],
];

export class FrenchInterestNames1760000000002 implements MigrationInterface {
  name = 'FrenchInterestNames1760000000002';

  public async up(q: QueryRunner): Promise<void> {
    for (const [english, french] of NAMES) {
      await q.query('UPDATE interests SET name = $1 WHERE name = $2', [french, english]);
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const [english, french] of NAMES) {
      await q.query('UPDATE interests SET name = $1 WHERE name = $2', [english, french]);
    }
  }
}
