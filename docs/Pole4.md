Félicitations pour être arrivé au bout ! Tu as mis en place une architecture réseau de niveau professionnel, ultra-sécurisée, et tout ça en contournant la contrainte de n'avoir qu'une seule IP publique chez OVH.

Voici la documentation complète et définitive de ton architecture. Garde ce document précieusement (tu peux le copier-coller dans un fichier texte ou sur un Notion), c'est ton plan de secours si tu dois refaire l'installation un jour.

---

# 📘 Documentation Technique : Architecture Proxmox + OPNsense + OpenVPN

## 🎯 Objectif de l'architecture
Protéger un parc de machines virtuelles (Bases de données, serveurs web) derrière un pare-feu OPNsense, en utilisant une **seule IP publique**. L'accès au réseau privé (LAN) se fait de manière chiffrée via un serveur OpenVPN.

### Schéma de principe
```text
[ INTERNET ] ---> IP Publique (51.83.8.192)
                     |
               [ PROXMOX (Hôte) ]
                     |-- vmbr0 (Public)
                     |-- vmbr2 (Pont privé WAN : 10.1.0.1)  --> NAT / Redirection de port 1194
                     |
               [ OPNsense (VM) ]
                     |-- WAN (10.1.0.250) <-- Reçoit le trafic VPN via Proxmox
                     |-- LAN (10.4.0.250) <-- Gère le réseau privé
                     |
               [ RESEAU LAN (10.4.0.0/16) ]
                     |-- VMs (Bases de données, etc.)
```

---

## 🛠️ PARTIE 1 : Configuration de Proxmox (Le "Routeur" principal)

Proxmox garde le contrôle de l'IP publique. Il partage sa connexion internet avec OPNsense et redirige le port VPN (1194) vers la VM OPNsense.

**Fichier modifié :** `/etc/network/interfaces`

**Le bloc de configuration clé (`vmbr2`) :**
```text
auto vmbr2
iface vmbr2 inet static
        # IP de Proxmox sur le réseau de transit vers OPNsense
        address 10.1.0.1/16
        bridge-ports none
        bridge-stp off
        bridge-fd 0
        
        # 1. Autorise le passage des données (Routage)
        post-up echo 1 > /proc/sys/net/ipv4/ip_forward
        
        # 2. Partage de la connexion Internet (MASQUERADE) pour le réseau 10.1.x.x
        post-up iptables -t nat -A POSTROUTING -s 10.1.0.0/16 -o vmbr0 -j MASQUERADE
        post-down iptables -t nat -D POSTROUTING -s 10.1.0.0/16 -o vmbr0 -j MASQUERADE
        
        # 3. Redirection du port VPN (1194 UDP) vers l'IP WAN de l'OPNsense
        post-up iptables -t nat -A PREROUTING -i vmbr0 -p udp --dport 1194 -j DNAT --to-destination 10.1.0.250:1194
        post-down iptables -t nat -D PREROUTING -i vmbr0 -p udp --dport 1194 -j DNAT --to-destination 10.1.0.250:1194
```
*Note : Après toute modification de ce fichier, il faut taper `sudo ifreload -a` ou redémarrer Proxmox.*

---

## 🛡️ PARTIE 2 : Configuration du réseau OPNsense

OPNsense possède deux cartes réseaux virtuelles dans Proxmox.

### 1. L'interface WAN (Connectée au `vmbr2` de Proxmox)
C'est par là qu'OPNsense accède à internet.
* **Type :** Static IPv4
* **Adresse IP :** `10.1.0.250 / 16`
* **Passerelle (Gateway) :** `10.1.0.1` (C'est Proxmox)
* **DNS :** `1.1.1.1`

### 2. L'interface LAN (Connectée au `vmbr1` de Proxmox)
C'est le réseau hautement sécurisé pour les VMs.
* **Type :** Static IPv4
* **Adresse IP :** `10.4.0.250 / 16`
* **Passerelle :** Aucune (OPNsense est la passerelle de ce réseau).

---

## 🔑 PARTIE 3 : Configuration du VPN (OpenVPN Instances)

Nous utilisons la méthode moderne (DCO) pour des performances optimales.

### 1. Les Certificats (Système > Confiance)
* **Autorité de certification (CA) :** Créée en interne, nommée `VPN-CA`.
* **Certificat Serveur :** Créé en interne, signé par `VPN-CA`, nommé `VPN-Serveur` (Type : *Server Certificate*).

### 2. L'Instance OpenVPN (VPN > OpenVPN > Instances)
* **Rôle :** Serveur
* **Protocole :** UDP
* **Port :** `1194`
* **Serveur (IPv4) / Réseau du tunnel :** `10.50.0.0/24` *(Le réseau virtuel alloué aux clients connectés).*
* **Réseau local (Routage) :** `10.4.0.0/16` *(Le réseau que les clients ont le droit de visiter).*
* **Authentification :** Local Database.
* **Redirect Gateway :** Coché (Force le trafic internet du client à passer par le VPN, optionnel).

### 3. Les Règles de Pare-feu (Pare-feu > Règles)
* **Sur le WAN :** Règle `Pass` pour le port de destination `1194` en `UDP`. *(Autorise le VPN à écouter).*
* **Sur OpenVPN :** Règle `Pass` globale. *(Autorise les clients connectés à discuter avec le LAN).*

---

## 👥 PARTIE 4 : Gestion des Utilisateurs

Pour donner l'accès au VPN à une nouvelle personne, il faut suivre un protocole strict d'isolation (1 utilisateur = 1 certificat).

### Étape A : Création de l'identité
1.  Aller dans **Système > Accès > Utilisateurs**.
2.  Créer l'utilisateur avec un login et un mot de passe.
3.  Cocher la case **Créer un certificat d'utilisateur** avant de sauvegarder.
4.  Générer le certificat en utilisant la CA `VPN-CA`.

### Étape B : Exportation du client
1.  Aller dans **VPN > OpenVPN > Exporter le client**.
2.  **TRÈS IMPORTANT :** Dans le champ **Hostname**, effacer l'IP locale affichée et mettre **l'IP Publique de Proxmox (`51.83.8.192`)**.
3.  Télécharger le fichier `.ovpn` correspondant à l'utilisateur dans la liste en bas de page.

---

### 💡 Rappel pour la création des futures VMs
Quand tu créeras tes futures machines virtuelles (ex: Base de données MySQL) dans Proxmox :
1.  Connecte leur carte réseau au **`vmbr1`** (Ton switch LAN virtuel).
2.  Configure leur réseau avec une IP dans le bloc **10.4.0.X** (ex: `10.4.0.10`).
3.  Mets le masque sur **`/16`** ou `255.255.0.0`.
4.  Mets la passerelle (Gateway) sur **`10.4.0.250`** (L'IP LAN d'OPNsense).

De cette façon, tes VMs n'auront accès à internet qu'en passant au travers des règles de sécurité stricte de ton OPNsense !